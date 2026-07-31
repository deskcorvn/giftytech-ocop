import type { GateCode, GateStatus } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/session";
import { appendAudit } from "@/lib/domain/audit";
import { nextGate } from "@/lib/domain/gates";
import { runIdempotent } from "@/lib/domain/idempotency";

export async function decideGate(actor: Actor, gateCode: GateCode, input: {
  enrollmentId: string;
  idempotencyKey: string;
  status: GateStatus;
  reason: string;
  score?: number;
}) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: `gate.decide:${gateCode}`,
    request: input,
    execute: async (tx) => {
      const enrollment = await tx.enrollment.findUnique({ where: { id: input.enrollmentId } });
      if (!enrollment) throw new ApiError(404, "enrollment_not_found", "Không tìm thấy hồ sơ học viên.");

      const gateTasks = await tx.taskDefinition.findMany({
        where: { gateCode, programVersion: { cohorts: { some: { id: enrollment.cohortId } } } },
        include: { taskProgress: { where: { enrollmentId: enrollment.id } } },
      });
      if (!gateTasks.length) throw new ApiError(422, "gate_has_no_tasks", "Gate không có nhiệm vụ cấu hình.");
      const incompleteTasks = gateTasks.filter((task) => task.taskProgress[0]?.state !== "ACCEPTED").map((task) => task.code);
      if (input.status === "ACCEPTED" && incompleteTasks.length) {
        throw new ApiError(422, "gate_not_ready", "Chưa thể chấp nhận gate vì còn nhiệm vụ chưa đạt.", { incompleteTasks });
      }

      const latest = await tx.gateDecision.findFirst({
        where: { enrollmentId: enrollment.id, gateCode },
        orderBy: { version: "desc" },
      });
      const decision = await tx.gateDecision.create({
        data: {
          enrollmentId: enrollment.id,
          gateCode,
          version: (latest?.version ?? 0) + 1,
          status: input.status,
          reason: input.reason,
          score: input.score,
          decidedById: actor.id,
        },
      });

      if (input.status === "ACCEPTED") {
        const followingGate = nextGate(gateCode);
        if (followingGate) {
          const nextTasks = await tx.taskDefinition.findMany({
            where: { gateCode: followingGate, programVersion: { cohorts: { some: { id: enrollment.cohortId } } } },
            select: { id: true },
          });
          await tx.taskProgress.updateMany({
            where: { enrollmentId: enrollment.id, taskDefinitionId: { in: nextTasks.map((task) => task.id) }, state: "LOCKED" },
            data: { state: "READY", version: { increment: 1 } },
          });
        }
      }

      await appendAudit(tx, { actorId: actor.id, cohortId: enrollment.cohortId, enrollmentId: enrollment.id, action: "gate.decided", entityType: "GateDecision", entityId: decision.id, data: { gateCode, status: input.status, version: decision.version } });
      return { id: decision.id, gateCode, status: decision.status, version: decision.version, decidedAt: decision.createdAt };
    },
  });
}
