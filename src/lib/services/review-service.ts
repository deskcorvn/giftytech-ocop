import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/session";
import { appendAudit } from "@/lib/domain/audit";
import { runIdempotent } from "@/lib/domain/idempotency";
import { getPrisma } from "@/lib/db/prisma";

export async function getMentorQueue(cohortId?: string) {
  const db = getPrisma();
  const submissions = await db.submission.findMany({
    where: {
      status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
      ...(cohortId ? { enrollment: { cohortId } } : {}),
    },
    include: {
      enrollment: { include: { user: true, cohort: true } },
      taskDefinition: true,
      evidenceAssets: { where: { status: "AVAILABLE" } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return submissions.map((submission) => ({
    id: submission.id,
    version: submission.version,
    submittedAt: submission.submittedAt,
    learner: { id: submission.enrollment.user.id, displayName: submission.enrollment.user.displayName },
    enrollment: { id: submission.enrollment.id, organizationName: submission.enrollment.organizationName, productName: submission.enrollment.productName },
    cohort: { id: submission.enrollment.cohort.id, code: submission.enrollment.cohort.code },
    task: { code: submission.taskDefinition.code, title: submission.taskDefinition.title, gateCode: submission.taskDefinition.gateCode },
    evidenceCount: submission.evidenceAssets.length,
  }));
}

export async function reviewSubmission(actor: Actor, input: {
  submissionId: string;
  idempotencyKey: string;
  decision: "ACCEPT" | "REVISION_REQUIRED" | "REJECT";
  score?: number;
  rubric?: Record<string, unknown>;
  feedback: string;
  criticalFlags: string[];
}) {
  if (input.decision === "ACCEPT" && input.criticalFlags.length) {
    throw new ApiError(422, "critical_flags_open", "Không thể chấp nhận bài khi còn cờ nghiêm trọng.");
  }

  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "submission.review",
    request: input,
    execute: async (tx) => {
      const submission = await tx.submission.findUnique({
        where: { id: input.submissionId },
        include: { enrollment: true, taskDefinition: true },
      });
      if (!submission) throw new ApiError(404, "submission_not_found", "Không tìm thấy bản nộp.");
      if (!["SUBMITTED", "UNDER_REVIEW"].includes(submission.status)) {
        throw new ApiError(409, "submission_not_reviewable", "Bản nộp không còn ở trạng thái chờ duyệt.");
      }

      const review = await tx.review.create({
        data: {
          submissionId: submission.id,
          reviewerId: actor.id,
          decision: input.decision,
          score: input.score,
          rubric: input.rubric as Prisma.InputJsonValue | undefined,
          feedback: input.feedback,
          criticalFlags: input.criticalFlags,
        },
      });
      const submissionStatus = input.decision === "ACCEPT" ? "ACCEPTED" : input.decision === "REVISION_REQUIRED" ? "REVISION_REQUIRED" : "REJECTED";
      const progressState = input.decision === "ACCEPT" ? "ACCEPTED" : "REVISION_REQUIRED";
      await tx.submission.update({ where: { id: submission.id }, data: { status: submissionStatus } });
      const progress = await tx.taskProgress.update({
        where: { enrollmentId_taskDefinitionId: { enrollmentId: submission.enrollmentId, taskDefinitionId: submission.taskDefinitionId } },
        data: { state: progressState, acceptedAt: input.decision === "ACCEPT" ? new Date() : null, version: { increment: 1 } },
      });
      await appendAudit(tx, {
        actorId: actor.id,
        cohortId: submission.enrollment.cohortId,
        enrollmentId: submission.enrollmentId,
        action: "submission.reviewed",
        entityType: "Review",
        entityId: review.id,
        data: { submissionId: submission.id, decision: input.decision, score: input.score, criticalFlags: input.criticalFlags },
      });
      return { reviewId: review.id, submissionId: submission.id, decision: review.decision, taskState: progress.state, progressVersion: progress.version };
    },
  });
}
