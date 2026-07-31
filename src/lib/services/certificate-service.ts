import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/session";
import { appendAudit } from "@/lib/domain/audit";
import { certificatePublicId } from "@/lib/domain/gates";
import { hashJson } from "@/lib/domain/hash";
import { runIdempotent } from "@/lib/domain/idempotency";
import { getPrisma } from "@/lib/db/prisma";

export async function issueCertificate(actor: Actor, input: { enrollmentId: string; idempotencyKey: string }) {
  return runIdempotent({
    key: input.idempotencyKey,
    actor,
    operation: "certificate.issue",
    request: input,
    execute: async (tx) => {
      const existing = await tx.certificate.findUnique({ where: { enrollmentId: input.enrollmentId } });
      if (existing) return { publicId: existing.publicId, score: existing.score, issuedAt: existing.issuedAt, replayedCertificate: true };

      const enrollment = await tx.enrollment.findUnique({
        where: { id: input.enrollmentId },
        include: {
          user: true,
          cohort: { include: { programVersion: { include: { program: true, taskDefinitions: { orderBy: { position: "asc" } } } } } },
          taskProgress: true,
          submissions: { where: { status: "ACCEPTED" }, orderBy: [{ taskDefinitionId: "asc" }, { version: "desc" }], include: { evidenceAssets: { where: { status: "AVAILABLE" } } } },
          gateDecisions: { orderBy: { version: "desc" } },
          productProfile: true,
        },
      });
      if (!enrollment) throw new ApiError(404, "enrollment_not_found", "Không tìm thấy hồ sơ học viên.");

      const finalGate = enrollment.gateDecisions.find((gate) => gate.gateCode === "G4");
      if (finalGate?.status !== "ACCEPTED") throw new ApiError(422, "final_gate_required", "Học viên chưa đạt G4 để cấp chứng chỉ.");

      const acceptedTaskIds = new Set(enrollment.taskProgress.filter((item) => item.state === "ACCEPTED").map((item) => item.taskDefinitionId));
      const score = enrollment.cohort.programVersion.taskDefinitions
        .filter((task) => acceptedTaskIds.has(task.id))
        .reduce((sum, task) => sum + task.weight, 0);
      if (score < 100) throw new ApiError(422, "program_incomplete", "Học viên chưa hoàn thành toàn bộ đầu ra bắt buộc.", { score });

      const latestSubmission = new Map<string, (typeof enrollment.submissions)[number]>();
      for (const submission of enrollment.submissions) {
        if (!latestSubmission.has(submission.taskDefinitionId)) latestSubmission.set(submission.taskDefinitionId, submission);
      }
      const gates = new Map<string, (typeof enrollment.gateDecisions)[number]>();
      for (const gate of enrollment.gateDecisions) {
        if (!gates.has(gate.gateCode)) gates.set(gate.gateCode, gate);
      }

      const snapshot = {
        schemaVersion: 1,
        program: { code: enrollment.cohort.programVersion.program.code, version: enrollment.cohort.programVersion.version, title: enrollment.cohort.programVersion.title },
        cohort: { code: enrollment.cohort.code, name: enrollment.cohort.name },
        learner: { id: enrollment.user.id, name: enrollment.user.displayName },
        organization: enrollment.organizationName,
        product: { name: enrollment.productName, profile: enrollment.productProfile?.publicData ?? null },
        province: enrollment.province,
        completedOutputs: enrollment.cohort.programVersion.taskDefinitions.map((task) => {
          const submission = latestSubmission.get(task.id);
          return {
            taskCode: task.code,
            title: task.title,
            weight: task.weight,
            submissionVersion: submission?.version,
            payload: submission?.payload ?? null,
            evidenceCodes: submission?.evidenceAssets.map((asset) => asset.evidenceCode) ?? [],
          };
        }),
        gates: Array.from(gates.values()).map((gate) => ({ code: gate.gateCode, status: gate.status, version: gate.version, decidedAt: gate.createdAt })),
        score,
        completedAt: new Date().toISOString(),
      };
      const snapshotHash = hashJson(snapshot);
      const publicId = certificatePublicId(enrollment.id, snapshotHash);
      const scoreVersion = (await tx.score.count({ where: { enrollmentId: enrollment.id } })) + 1;
      await tx.score.create({ data: { enrollmentId: enrollment.id, version: scoreVersion, total: score, breakdown: { acceptedWeight: score }, inputHash: snapshotHash } });
      const certificate = await tx.certificate.create({
        data: {
          publicId,
          enrollmentId: enrollment.id,
          score,
          snapshot: snapshot as Prisma.InputJsonValue,
          snapshotHash,
          issuedById: actor.id,
        },
      });
      await tx.enrollment.update({ where: { id: enrollment.id }, data: { status: "COMPLETED", completedAt: certificate.issuedAt } });
      await appendAudit(tx, { actorId: actor.id, cohortId: enrollment.cohortId, enrollmentId: enrollment.id, action: "certificate.issued", entityType: "Certificate", entityId: certificate.id, data: { publicId, snapshotHash, score } });
      return { publicId, score, issuedAt: certificate.issuedAt, snapshotHash, replayedCertificate: false };
    },
  });
}

export async function getPublicCertificate(publicId: string) {
  const db = getPrisma();
  const certificate = await db.certificate.findUnique({
    where: { publicId },
    include: { enrollment: { include: { user: true, cohort: { include: { programVersion: { include: { program: true } } } } } } },
  });
  if (!certificate) throw new ApiError(404, "certificate_not_found", "Không tìm thấy chứng chỉ.");
  return {
    publicId: certificate.publicId,
    status: certificate.status,
    learnerName: certificate.enrollment.user.displayName,
    organizationName: certificate.enrollment.organizationName,
    productName: certificate.enrollment.productName,
    province: certificate.enrollment.province,
    programName: certificate.enrollment.cohort.programVersion.program.name,
    programVersion: certificate.enrollment.cohort.programVersion.version,
    cohortName: certificate.enrollment.cohort.name,
    score: certificate.score,
    issuedAt: certificate.issuedAt,
    revokedAt: certificate.revokedAt,
  };
}
