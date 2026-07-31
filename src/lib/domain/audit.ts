import { Prisma } from "@prisma/client";

type AuditInput = {
  actorId?: string;
  cohortId?: string;
  enrollmentId?: string;
  action: string;
  entityType: string;
  entityId: string;
  data?: unknown;
};

export async function appendAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  return tx.auditEvent.create({
    data: {
      actorId: input.actorId,
      cohortId: input.cohortId,
      enrollmentId: input.enrollmentId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      data: input.data === undefined ? undefined : JSON.parse(JSON.stringify(input.data)),
    },
  });
}
