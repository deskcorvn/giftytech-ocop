import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { appendAudit } from "@/lib/domain/audit";
import { hashJson } from "@/lib/domain/hash";
import { runIdempotent } from "@/lib/domain/idempotency";

export async function getCoordinatorDashboard(cohortId?: string) {
  const db = getPrisma();
  const cohort = await db.cohort.findFirst({
    where: cohortId ? { id: cohortId } : { status: { in: ["OPEN", "ACTIVE"] } },
    orderBy: { startAt: "desc" },
    include: {
      enrollments: {
        include: {
          gateDecisions: { orderBy: { version: "desc" } },
          taskProgress: { include: { taskDefinition: true } },
          certificate: true,
        },
      },
      incidents: { where: { status: { in: ["OPEN", "INVESTIGATING"] } } },
    },
  });
  if (!cohort) throw new ApiError(404, "cohort_not_found", "Không tìm thấy lớp học.");

  const denominator = cohort.baselineCount ?? cohort.enrollments.length;
  const gateCounts = Object.fromEntries(["G0", "G1", "G2", "G3", "G4"].map((gateCode) => [
    gateCode,
    cohort.enrollments.filter((enrollment) => enrollment.gateDecisions.find((item) => item.gateCode === gateCode)?.status === "ACCEPTED").length,
  ]));
  const percentage = (count: number) => denominator ? Math.round((count / denominator) * 1000) / 10 : 0;

  return {
    cohort: { id: cohort.id, code: cohort.code, name: cohort.name, status: cohort.status, startAt: cohort.startAt, endAt: cohort.endAt },
    denominator,
    enrolledRecords: cohort.enrollments.length,
    missingRecords: Math.max(0, denominator - cohort.enrollments.length),
    funnel: Object.fromEntries(Object.entries(gateCounts).map(([gate, count]) => [gate, { count, denominator, percent: percentage(count) }])),
    certificatesIssued: cohort.enrollments.filter((item) => item.certificate?.status === "ISSUED").length,
    openIncidents: cohort.incidents.length,
    learnerStates: cohort.enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      status: enrollment.status,
      acceptedTasks: enrollment.taskProgress.filter((item) => item.state === "ACCEPTED").length,
      pendingReview: enrollment.taskProgress.filter((item) => item.state === "SUBMITTED").length,
      revisionRequired: enrollment.taskProgress.filter((item) => item.state === "REVISION_REQUIRED").length,
    })),
  };
}

export async function createReportSnapshot(actor: Actor, input: { cohortId: string; kind: string; idempotencyKey: string }) {
  const dashboard = await getCoordinatorDashboard(input.cohortId);
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "report.snapshot",
    request: input,
    execute: async (tx) => {
      const inputHash = hashJson(dashboard);
      const snapshot = await tx.reportSnapshot.create({
        data: { cohortId: input.cohortId, kind: input.kind, inputHash, data: dashboard as Prisma.InputJsonValue },
      });
      await appendAudit(tx, { actorId: actor.id, cohortId: input.cohortId, action: "report.snapshot_created", entityType: "ReportSnapshot", entityId: snapshot.id, data: { kind: input.kind, inputHash } });
      return { id: snapshot.id, kind: snapshot.kind, inputHash, createdAt: snapshot.createdAt, data: snapshot.data };
    },
  });
}

export async function getReportSnapshot(snapshotId: string) {
  const db = getPrisma();
  const snapshot = await db.reportSnapshot.findUnique({ where: { id: snapshotId }, include: { cohort: true } });
  if (!snapshot) throw new ApiError(404, "snapshot_not_found", "Không tìm thấy bản chụp báo cáo.");
  return snapshot;
}

export async function createIncident(actor: Actor, input: {
  cohortId: string;
  enrollmentId?: string;
  severity: "S1" | "S2" | "S3" | "S4";
  category: string;
  description: string;
  assignedToId?: string;
  idempotencyKey: string;
}) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "incident.create",
    request: input,
    execute: async (tx) => {
      const cohort = await tx.cohort.findUnique({ where: { id: input.cohortId } });
      if (!cohort) throw new ApiError(404, "cohort_not_found", "Không tìm thấy lớp học.");
      if (actor.role === "LEARNER") {
        if (!input.enrollmentId) throw new ApiError(422, "enrollment_required", "Yêu cầu hỗ trợ cần gắn với hồ sơ học viên.");
        const ownEnrollment = await tx.enrollment.count({
          where: { id: input.enrollmentId, cohortId: cohort.id, userId: actor.id },
        });
        if (!ownEnrollment) throw new ApiError(403, "forbidden", "Bạn không thể gửi yêu cầu cho hồ sơ học viên khác.");
        if (["S1", "S2"].includes(input.severity)) {
          throw new ApiError(422, "invalid_learner_severity", "Vui lòng chọn yêu cầu hỗ trợ thông thường hoặc cần phản hồi sớm.");
        }
      }
      if (input.enrollmentId) {
        const validEnrollment = await tx.enrollment.count({ where: { id: input.enrollmentId, cohortId: cohort.id } });
        if (!validEnrollment) throw new ApiError(422, "invalid_enrollment", "Học viên không thuộc lớp này.");
      }
      const incident = await tx.incident.create({
        data: {
          cohortId: cohort.id,
          enrollmentId: input.enrollmentId,
          createdById: actor.id,
          assignedToId: input.assignedToId,
          severity: input.severity,
          category: input.category,
          description: input.description,
        },
      });
      await appendAudit(tx, { actorId: actor.id, cohortId: cohort.id, enrollmentId: input.enrollmentId, action: "incident.created", entityType: "Incident", entityId: incident.id, data: { severity: input.severity, category: input.category } });
      return { id: incident.id, status: incident.status, severity: incident.severity, createdAt: incident.createdAt };
    },
  });
}
