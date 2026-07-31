import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/session";
import { appendAudit } from "@/lib/domain/audit";
import { runIdempotent } from "@/lib/domain/idempotency";
import { validateTaskPayload } from "@/lib/domain/validation";
import { learnerEnrollmentInTransaction } from "@/lib/services/enrollment-service";

async function getTaskAndProgress(tx: Prisma.TransactionClient, enrollmentId: string, taskCode: string) {
  const task = await tx.taskDefinition.findFirst({
    where: { code: taskCode, programVersion: { cohorts: { some: { enrollments: { some: { id: enrollmentId } } } } } },
    include: { evidenceRequirements: { include: { evidenceDefinition: true } } },
  });
  if (!task) throw new ApiError(404, "task_not_found", "Không tìm thấy nhiệm vụ trong chương trình hiện tại.");
  const progress = await tx.taskProgress.findUnique({
    where: { enrollmentId_taskDefinitionId: { enrollmentId, taskDefinitionId: task.id } },
  });
  if (!progress) throw new ApiError(409, "progress_not_initialized", "Tiến độ nhiệm vụ chưa được khởi tạo.");
  return { task, progress };
}

function assertVersion(actual: number, expected: number) {
  if (actual !== expected) {
    throw new ApiError(409, "version_conflict", "Có phiên bản mới hơn trên máy chủ.", { expectedVersion: expected, serverVersion: actual });
  }
}

export async function startTask(actor: Actor, taskCode: string, input: { idempotencyKey: string; expectedVersion: number }) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: `task.start:${taskCode}`,
    request: input,
    execute: async (tx) => {
      const enrollment = await learnerEnrollmentInTransaction(tx, actor);
      const { task, progress } = await getTaskAndProgress(tx, enrollment.id, taskCode);
      assertVersion(progress.version, input.expectedVersion);
      if (progress.state === "LOCKED") throw new ApiError(409, "task_locked", "Nhiệm vụ chưa được mở khóa.");
      if (["SUBMITTED", "ACCEPTED"].includes(progress.state)) throw new ApiError(409, "task_not_editable", "Nhiệm vụ đang chờ duyệt hoặc đã được chấp nhận.");

      const updated = progress.state === "READY"
        ? await tx.taskProgress.update({
            where: { id: progress.id },
            data: { state: "IN_PROGRESS", startedAt: new Date(), version: { increment: 1 } },
          })
        : progress;
      await appendAudit(tx, { actorId: actor.id, cohortId: enrollment.cohortId, enrollmentId: enrollment.id, action: "task.started", entityType: "TaskProgress", entityId: progress.id, data: { taskCode } });
      return { taskCode: task.code, state: updated.state, version: updated.version, startedAt: updated.startedAt };
    },
  });
}

export async function saveDraft(actor: Actor, taskCode: string, input: { idempotencyKey: string; expectedVersion: number; payload: Record<string, unknown> }) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: `draft.save:${taskCode}`,
    request: input,
    execute: async (tx) => {
      const enrollment = await learnerEnrollmentInTransaction(tx, actor);
      const { task, progress } = await getTaskAndProgress(tx, enrollment.id, taskCode);
      if (progress.state === "LOCKED") throw new ApiError(409, "task_locked", "Nhiệm vụ chưa được mở khóa.");
      if (["SUBMITTED", "ACCEPTED"].includes(progress.state)) throw new ApiError(409, "task_not_editable", "Nhiệm vụ đang chờ duyệt hoặc đã được chấp nhận.");

      const current = await tx.draft.findUnique({
        where: { enrollmentId_taskDefinitionId: { enrollmentId: enrollment.id, taskDefinitionId: task.id } },
      });
      assertVersion(current?.version ?? 0, input.expectedVersion);
      const draft = current
        ? await tx.draft.update({ where: { id: current.id }, data: { payload: input.payload as Prisma.InputJsonValue, version: { increment: 1 } } })
        : await tx.draft.create({ data: { enrollmentId: enrollment.id, taskDefinitionId: task.id, payload: input.payload as Prisma.InputJsonValue } });

      if (progress.state === "READY") {
        await tx.taskProgress.update({ where: { id: progress.id }, data: { state: "IN_PROGRESS", startedAt: new Date(), version: { increment: 1 } } });
      }
      await appendAudit(tx, { actorId: actor.id, cohortId: enrollment.cohortId, enrollmentId: enrollment.id, action: "draft.saved", entityType: "Draft", entityId: draft.id, data: { taskCode, version: draft.version } });
      return { taskCode, draftId: draft.id, version: draft.version, savedAt: draft.updatedAt };
    },
  });
}

export async function submitTask(actor: Actor, input: {
  taskCode: string;
  idempotencyKey: string;
  expectedVersion: number;
  payload: Record<string, unknown>;
  evidenceAssetIds: string[];
}) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: `submission.create:${input.taskCode}`,
    request: input,
    execute: async (tx) => {
      const enrollment = await learnerEnrollmentInTransaction(tx, actor);
      const { task, progress } = await getTaskAndProgress(tx, enrollment.id, input.taskCode);
      assertVersion(progress.version, input.expectedVersion);
      if (progress.state === "LOCKED") throw new ApiError(409, "task_locked", "Nhiệm vụ chưa được mở khóa.");
      if (["SUBMITTED", "ACCEPTED"].includes(progress.state)) throw new ApiError(409, "task_not_submittable", "Nhiệm vụ đang chờ duyệt hoặc đã được chấp nhận.");
      validateTaskPayload(task.fieldSchema, input.payload);

      if (input.evidenceAssetIds.length) {
        const evidenceAssets = await tx.evidenceAsset.findMany({
          where: { id: { in: input.evidenceAssetIds }, enrollmentId: enrollment.id, status: "AVAILABLE", submissionId: null },
        });
        if (evidenceAssets.length !== input.evidenceAssetIds.length) {
          throw new ApiError(422, "invalid_evidence", "Có minh chứng không tồn tại, không thuộc học viên hoặc đã được dùng.");
        }

        const selectedCodes = new Set(evidenceAssets.map((asset) => asset.evidenceCode));
        const missingEvidence = task.evidenceRequirements
          .filter((requirement) => requirement.required && !selectedCodes.has(requirement.evidenceDefinition.code))
          .map((requirement) => requirement.evidenceDefinition.code);
        if (missingEvidence.length) {
          throw new ApiError(422, "evidence_required", "Chưa đủ minh chứng bắt buộc để nộp bài.", { missingEvidence });
        }
      } else if (task.evidenceRequirements.some((requirement) => requirement.required)) {
        throw new ApiError(422, "evidence_required", "Vui lòng tải đủ minh chứng bắt buộc trước khi nộp bài.", {
          missingEvidence: task.evidenceRequirements.filter((requirement) => requirement.required).map((requirement) => requirement.evidenceDefinition.code),
        });
      }

      const previous = await tx.submission.findFirst({
        where: { enrollmentId: enrollment.id, taskDefinitionId: task.id },
        orderBy: { version: "desc" },
      });
      if (previous && previous.status !== "REVISION_REQUIRED" && previous.status !== "REJECTED" && previous.status !== "SUPERSEDED") {
        throw new ApiError(409, "submission_pending", "Bản nộp hiện tại chưa cho phép nộp phiên bản mới.");
      }
      if (previous && previous.status !== "SUPERSEDED") {
        await tx.submission.update({ where: { id: previous.id }, data: { status: "SUPERSEDED" } });
      }

      const submission = await tx.submission.create({
        data: {
          enrollmentId: enrollment.id,
          taskDefinitionId: task.id,
          version: (previous?.version ?? 0) + 1,
          payload: input.payload as Prisma.InputJsonValue,
        },
      });
      if (input.evidenceAssetIds.length) {
        await tx.evidenceAsset.updateMany({ where: { id: { in: input.evidenceAssetIds } }, data: { submissionId: submission.id, taskDefinitionId: task.id } });
      }
      const updatedProgress = await tx.taskProgress.update({
        where: { id: progress.id },
        data: { state: "SUBMITTED", submittedAt: new Date(), version: { increment: 1 } },
      });

      if (input.taskCode === "learner-profile") {
        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            organizationName: String(input.payload.organizationName),
            productName: String(input.payload.productName),
            province: String(input.payload.province),
            primaryChannel: String(input.payload.primaryChannel),
          },
        });
      }
      if (input.taskCode === "product-record") {
        await tx.productProfile.upsert({
          where: { enrollmentId: enrollment.id },
          create: {
            enrollmentId: enrollment.id,
            publicData: { packageSize: input.payload.packageSize, productFacts: input.payload.productFacts } as Prisma.InputJsonValue,
            pendingData: { pendingFacts: input.payload.pendingFacts } as Prisma.InputJsonValue,
            sourceNotes: String(input.payload.dataSource),
          },
          update: {
            publicData: { packageSize: input.payload.packageSize, productFacts: input.payload.productFacts } as Prisma.InputJsonValue,
            pendingData: { pendingFacts: input.payload.pendingFacts } as Prisma.InputJsonValue,
            sourceNotes: String(input.payload.dataSource),
            version: { increment: 1 },
          },
        });
      }

      await appendAudit(tx, { actorId: actor.id, cohortId: enrollment.cohortId, enrollmentId: enrollment.id, action: "submission.created", entityType: "Submission", entityId: submission.id, data: { taskCode: task.code, version: submission.version, evidenceAssetIds: input.evidenceAssetIds } });
      return { id: submission.id, taskCode: task.code, version: submission.version, status: submission.status, progressVersion: updatedProgress.version, submittedAt: submission.submittedAt };
    },
  });
}
