import { Prisma, type User } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import { getPrisma } from "@/lib/db/prisma";
import { hashJson } from "@/lib/domain/hash";

type IdempotentInput<T> = {
  key: string;
  actor: Pick<User, "id">;
  operation: string;
  request: unknown;
  execute: (tx: Prisma.TransactionClient) => Promise<T>;
};

export async function runIdempotent<T>({ key, actor, operation, request, execute }: IdempotentInput<T>) {
  const db = getPrisma();
  const requestHash = hashJson(request);

  return db.$transaction(async (tx) => {
    const existing = await tx.idempotencyRecord.findUnique({ where: { key } });
    if (existing) {
      if (existing.actorId !== actor.id || existing.operation !== operation || existing.requestHash !== requestHash) {
        throw new ApiError(409, "idempotency_conflict", "Khóa idempotency đã được dùng cho yêu cầu khác.");
      }
      return { replayed: true, value: existing.responseBody as T };
    }

    const value = await execute(tx);
    const responseBody = JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    await tx.idempotencyRecord.create({
      data: {
        key,
        actorId: actor.id,
        operation,
        requestHash,
        responseStatus: 200,
        responseBody,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { replayed: false, value };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
