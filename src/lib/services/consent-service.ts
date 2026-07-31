import type { Actor } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/errors";
import { appendAudit } from "@/lib/domain/audit";
import { runIdempotent } from "@/lib/domain/idempotency";

export async function updateConsent(actor: Actor, input: {
  consentProcessing: true;
  consentShowcase: boolean;
  idempotencyKey: string;
}) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "consent.update",
    request: input,
    execute: async (tx) => {
      const enrollment = await tx.enrollment.findFirst({
        where: { userId: actor.id, status: { in: ["ACTIVE", "PAUSED"] }, cohort: { status: { in: ["OPEN", "ACTIVE"] } } },
        orderBy: { enrolledAt: "desc" },
      });
      if (!enrollment) throw new ApiError(404, "enrollment_not_found", "Tài khoản chưa có lớp học đang hoạt động.");
      const updated = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { consentProcessing: input.consentProcessing, consentShowcase: input.consentShowcase },
      });
      await appendAudit(tx, { actorId: actor.id, cohortId: enrollment.cohortId, enrollmentId: enrollment.id, action: "consent.updated", entityType: "Enrollment", entityId: enrollment.id, data: { consentProcessing: true, consentShowcase: input.consentShowcase } });
      return { enrollmentId: updated.id, consentProcessing: updated.consentProcessing, consentShowcase: updated.consentShowcase, recordedAt: updated.updatedAt };
    },
  });
}
