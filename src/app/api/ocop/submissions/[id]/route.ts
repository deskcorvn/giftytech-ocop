import { ApiError, handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const actor = await requireActor();
    const { id } = await context.params;
    const submission = await getPrisma().submission.findUnique({
      where: { id },
      include: { enrollment: true, taskDefinition: true, reviews: { include: { reviewer: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } }, evidenceAssets: { where: { status: "AVAILABLE" } } },
    });
    if (!submission) throw new ApiError(404, "submission_not_found", "Không tìm thấy bản nộp.");
    if (actor.role === "LEARNER" && submission.enrollment.userId !== actor.id) throw new ApiError(403, "forbidden", "Bạn không có quyền xem bản nộp này.");
    return {
      id: submission.id,
      task: { code: submission.taskDefinition.code, title: submission.taskDefinition.title, contentSchema: submission.taskDefinition.contentSchema, fieldSchema: submission.taskDefinition.fieldSchema },
      version: submission.version,
      status: submission.status,
      payload: submission.payload,
      submittedAt: submission.submittedAt,
      evidence: submission.evidenceAssets.map((asset) => ({ id: asset.id, code: asset.evidenceCode, name: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes })),
      reviews: submission.reviews.map((review) => ({ decision: review.decision, score: review.score, feedback: review.feedback, criticalFlags: review.criticalFlags, reviewerName: review.reviewer.displayName, createdAt: review.createdAt })),
    };
  });
}
