import { hash } from "bcryptjs";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { appendAudit } from "@/lib/domain/audit";
import { runIdempotent } from "@/lib/domain/idempotency";

export async function listCohorts() {
  return getPrisma().cohort.findMany({
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startAt: true,
      endAt: true,
      baselineCount: true,
      _count: { select: { enrollments: true, incidents: true } },
      programVersion: { select: { version: true, title: true, program: { select: { code: true, name: true } } } },
    },
  });
}

export async function createCohort(actor: Actor, input: {
  programCode: string;
  programVersion: number;
  code: string;
  name: string;
  startAt: string;
  endAt: string;
  baselineCount?: number;
  idempotencyKey: string;
}) {
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  if (!(startAt < endAt)) throw new ApiError(422, "invalid_cohort_dates", "Ngày kết thúc phải sau ngày bắt đầu.");

  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "cohort.create",
    request: input,
    execute: async (tx) => {
      const programVersion = await tx.programVersion.findFirst({
        where: { version: input.programVersion, status: "PUBLISHED", program: { code: input.programCode } },
      });
      if (!programVersion) throw new ApiError(404, "program_version_not_found", "Không tìm thấy phiên bản giáo trình đã phát hành.");
      const cohort = await tx.cohort.create({
        data: {
          programVersionId: programVersion.id,
          code: input.code,
          name: input.name,
          status: "DRAFT",
          startAt,
          endAt,
          baselineCount: input.baselineCount,
        },
      });
      await appendAudit(tx, { actorId: actor.id, cohortId: cohort.id, action: "cohort.created", entityType: "Cohort", entityId: cohort.id, data: { code: cohort.code, programVersion: input.programVersion } });
      return cohort;
    },
  });
}

const COHORT_TRANSITIONS = {
  DRAFT: ["OPEN"],
  OPEN: ["ACTIVE", "CLOSED"],
  ACTIVE: ["CLOSED"],
  CLOSED: ["ARCHIVED"],
  ARCHIVED: [],
} as const;

export async function updateCohortStatus(actor: Actor, cohortId: string, input: {
  status: "DRAFT" | "OPEN" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  idempotencyKey: string;
}) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "cohort.status.update",
    request: { cohortId, ...input },
    execute: async (tx) => {
      const cohort = await tx.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort) throw new ApiError(404, "cohort_not_found", "Không tìm thấy lớp học.");
      const allowed = COHORT_TRANSITIONS[cohort.status] as readonly string[];
      if (cohort.status !== input.status && !allowed.includes(input.status)) {
        throw new ApiError(409, "invalid_cohort_transition", `Không thể chuyển lớp từ ${cohort.status} sang ${input.status}.`);
      }
      const updated = cohort.status === input.status ? cohort : await tx.cohort.update({ where: { id: cohort.id }, data: { status: input.status } });
      await appendAudit(tx, { actorId: actor.id, cohortId: cohort.id, action: "cohort.status_updated", entityType: "Cohort", entityId: cohort.id, data: { from: cohort.status, to: input.status } });
      return { id: updated.id, code: updated.code, status: updated.status, updatedAt: updated.updatedAt };
    },
  });
}

export async function enrollLearner(actor: Actor, cohortId: string, input: {
  username: string;
  displayName: string;
  password?: string;
  organizationName: string;
  productName: string;
  province: string;
  primaryChannel?: string;
  consentProcessing: boolean;
  consentShowcase?: boolean;
  idempotencyKey: string;
}) {
  const normalizedUsername = input.username.trim().toLowerCase();
  const passwordHash = input.password ? await hash(input.password, 12) : null;
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "enrollment.create",
    request: { ...input, password: input.password ? "[provided]" : undefined, cohortId },
    execute: async (tx) => {
      const cohort = await tx.cohort.findUnique({
        where: { id: cohortId },
        include: { programVersion: { include: { taskDefinitions: true } } },
      });
      if (!cohort) throw new ApiError(404, "cohort_not_found", "Không tìm thấy lớp học.");

      let user = await tx.user.findUnique({ where: { username: normalizedUsername }, include: { credential: true } });
      if (!user) {
        if (!passwordHash) throw new ApiError(422, "password_required", "Tài khoản mới cần mật khẩu ban đầu.");
        user = await tx.user.create({
          data: {
            username: normalizedUsername,
            displayName: input.displayName,
            role: "LEARNER",
            credential: { create: { passwordHash } },
          },
          include: { credential: true },
        });
      } else if (user.role !== "LEARNER") {
        throw new ApiError(409, "role_conflict", "Tài khoản đã tồn tại với vai trò khác.");
      }

      const existing = await tx.enrollment.findUnique({ where: { cohortId_userId: { cohortId, userId: user.id } } });
      if (existing) throw new ApiError(409, "already_enrolled", "Học viên đã có trong lớp.");
      const enrollment = await tx.enrollment.create({
        data: {
          cohortId,
          userId: user.id,
          status: "ACTIVE",
          organizationName: input.organizationName,
          productName: input.productName,
          province: input.province,
          primaryChannel: input.primaryChannel,
          consentProcessing: input.consentProcessing,
          consentShowcase: input.consentShowcase ?? false,
        },
      });
      const firstTaskPosition = Math.min(...cohort.programVersion.taskDefinitions.map((task) => task.position));
      await tx.taskProgress.createMany({
        data: cohort.programVersion.taskDefinitions.map((task) => ({
          enrollmentId: enrollment.id,
          taskDefinitionId: task.id,
          state: task.position === firstTaskPosition ? "READY" : "LOCKED",
        })),
      });
      await appendAudit(tx, { actorId: actor.id, cohortId, enrollmentId: enrollment.id, action: "enrollment.created", entityType: "Enrollment", entityId: enrollment.id, data: { username: normalizedUsername, consentProcessing: input.consentProcessing, consentShowcase: input.consentShowcase ?? false } });
      return { id: enrollment.id, userId: user.id, username: user.username, status: enrollment.status, taskCount: cohort.programVersion.taskDefinitions.length };
    },
  });
}
