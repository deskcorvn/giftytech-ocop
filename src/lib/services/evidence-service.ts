import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import type { Actor } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/errors";
import { getPrisma } from "@/lib/db/prisma";
import { appendAudit } from "@/lib/domain/audit";
import { hashJson, sha256 } from "@/lib/domain/hash";
import { getLearnerEnrollment, requireEnrollmentAccess } from "@/lib/services/enrollment-service";

const SAFE_FILENAME = /[^a-zA-Z0-9._-]+/g;
const ENCRYPTED_MAGIC = Buffer.from("GOCOP1", "ascii");
const IV_BYTES = 12;
const TAG_BYTES = 16;

function evidenceEncryptionKey() {
  const encoded = process.env.EVIDENCE_ENCRYPTION_KEY;
  if (!encoded) throw new Error("EVIDENCE_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("EVIDENCE_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

export function encryptEvidenceBytes(bytes: Buffer, key: Buffer) {
  if (key.length !== 32) throw new Error("Evidence encryption key must contain 32 bytes");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([ENCRYPTED_MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptEvidenceBytes(envelope: Buffer, key: Buffer) {
  const headerBytes = ENCRYPTED_MAGIC.length + IV_BYTES + TAG_BYTES;
  if (key.length !== 32 || envelope.length < headerBytes || !envelope.subarray(0, ENCRYPTED_MAGIC.length).equals(ENCRYPTED_MAGIC)) {
    throw new Error("Invalid encrypted evidence envelope");
  }
  const ivStart = ENCRYPTED_MAGIC.length;
  const tagStart = ivStart + IV_BYTES;
  const decipher = createDecipheriv("aes-256-gcm", key, envelope.subarray(ivStart, tagStart));
  decipher.setAuthTag(envelope.subarray(tagStart, tagStart + TAG_BYTES));
  return Buffer.concat([decipher.update(envelope.subarray(headerBytes)), decipher.final()]);
}

function safeFilename(value: string) {
  const cleaned = value.normalize("NFKD").replace(SAFE_FILENAME, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned.slice(-100) || "evidence.bin";
}

export function detectEvidenceMime(bytes: Buffer): string | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

export async function uploadEvidence(actor: Actor, input: { taskCode: string; evidenceCode: string; idempotencyKey: string; file: File }) {
  const db = getPrisma();
  const enrollment = await getLearnerEnrollment(actor);
  const operation = "evidence.upload";
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const requestHash = hashJson({ taskCode: input.taskCode, evidenceCode: input.evidenceCode, fileName: input.file.name, fileSize: input.file.size, fileType: input.file.type, contentHash });
  const existing = await db.idempotencyRecord.findUnique({ where: { key: input.idempotencyKey } });
  if (existing) {
    if (existing.actorId !== actor.id || existing.operation !== operation || existing.requestHash !== requestHash) {
      throw new ApiError(409, "idempotency_conflict", "Khóa idempotency đã được dùng cho yêu cầu khác.");
    }
    return { replayed: true, value: existing.responseBody };
  }

  const task = await db.taskDefinition.findFirst({
    where: { code: input.taskCode, programVersion: { cohorts: { some: { id: enrollment.cohortId } } } },
    include: { evidenceRequirements: { include: { evidenceDefinition: true } } },
  });
  if (!task) throw new ApiError(404, "task_not_found", "Không tìm thấy nhiệm vụ.");
  const requirement = task.evidenceRequirements.find((item) => item.evidenceDefinition.code === input.evidenceCode);
  if (!requirement) throw new ApiError(422, "evidence_not_allowed", "Loại minh chứng không thuộc nhiệm vụ này.");
  if (!requirement.evidenceDefinition.allowedMimeTypes.includes(input.file.type)) {
    throw new ApiError(415, "unsupported_media_type", "Định dạng tệp không được hỗ trợ.", { allowedMimeTypes: requirement.evidenceDefinition.allowedMimeTypes });
  }
  if (input.file.size <= 0 || input.file.size > requirement.evidenceDefinition.maxSizeBytes) {
    throw new ApiError(413, "file_too_large", "Tệp vượt quá dung lượng cho phép.", { maxSizeBytes: requirement.evidenceDefinition.maxSizeBytes });
  }
  const detectedType = detectEvidenceMime(bytes);
  if (!detectedType || detectedType !== input.file.type) {
    throw new ApiError(415, "mime_mismatch", "Nội dung tệp không khớp với định dạng đã khai báo.", { declaredType: input.file.type, detectedType });
  }
  const currentCount = await db.evidenceAsset.count({ where: { enrollmentId: enrollment.id, taskDefinitionId: task.id, evidenceCode: input.evidenceCode, status: "AVAILABLE" } });
  if (currentCount >= requirement.evidenceDefinition.maxFiles) throw new ApiError(422, "evidence_limit_reached", "Đã đạt số tệp tối đa cho loại minh chứng này.");

  const storageKey = `ocop/${enrollment.cohortId}/${enrollment.id}/${input.evidenceCode}/${sha256(input.idempotencyKey).slice(0, 16)}-${safeFilename(input.file.name)}`;
  const encryptedBytes = encryptEvidenceBytes(bytes, evidenceEncryptionKey());
  const uploaded = await put(storageKey, encryptedBytes, { access: "public", contentType: "application/octet-stream", addRandomSuffix: false });

  try {
    const result = await db.$transaction(async (tx) => {
      const asset = await tx.evidenceAsset.create({
        data: {
          enrollmentId: enrollment.id,
          taskDefinitionId: task.id,
          evidenceCode: input.evidenceCode,
          storageKey,
          blobUrl: uploaded.url,
          originalName: input.file.name,
          mimeType: input.file.type,
          sizeBytes: input.file.size,
          sha256: contentHash,
          uploadedById: actor.id,
        },
      });
      const value = { id: asset.id, taskCode: input.taskCode, evidenceCode: asset.evidenceCode, name: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, sha256: asset.sha256 };
      await tx.idempotencyRecord.create({
        data: { key: input.idempotencyKey, actorId: actor.id, operation, requestHash, responseStatus: 201, responseBody: value, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      });
      await appendAudit(tx, { actorId: actor.id, cohortId: enrollment.cohortId, enrollmentId: enrollment.id, action: "evidence.uploaded", entityType: "EvidenceAsset", entityId: asset.id, data: { evidenceCode: asset.evidenceCode, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, sha256: asset.sha256 } });
      return value;
    });
    return { replayed: false, value: result };
  } catch (error) {
    await del(uploaded.url).catch(() => undefined);
    throw error;
  }
}

export async function streamEvidence(actor: Actor, assetId: string) {
  const db = getPrisma();
  const asset = await db.evidenceAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "AVAILABLE") throw new ApiError(404, "evidence_not_found", "Không tìm thấy minh chứng.");
  await requireEnrollmentAccess(actor, asset.enrollmentId);
  const blob = await get(asset.storageKey, { access: "public" });
  if (!blob || blob.statusCode === 304 || !blob.stream) throw new ApiError(404, "evidence_blob_not_found", "Tệp minh chứng không còn trên kho lưu trữ.");
  const encryptedBytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
  const bytes = decryptEvidenceBytes(encryptedBytes, evidenceEncryptionKey());
  return { stream: bytes, mimeType: asset.mimeType, filename: asset.originalName, sizeBytes: asset.sizeBytes };
}

export async function deleteEvidence(actor: Actor, assetId: string) {
  const db = getPrisma();
  const asset = await db.evidenceAsset.findUnique({ where: { id: assetId }, include: { enrollment: true } });
  if (!asset || asset.status === "DELETED") return { deleted: true };
  if (actor.role === "LEARNER" && asset.enrollment.userId !== actor.id) throw new ApiError(403, "forbidden", "Bạn không có quyền xóa minh chứng này.");
  if (asset.submissionId) throw new ApiError(409, "evidence_in_use", "Không thể xóa minh chứng đã gắn vào bản nộp.");

  await del(asset.blobUrl);
  await db.$transaction(async (tx) => {
    await tx.evidenceAsset.update({ where: { id: asset.id }, data: { status: "DELETED", deletedAt: new Date() } });
    await appendAudit(tx, { actorId: actor.id, cohortId: asset.enrollment.cohortId, enrollmentId: asset.enrollmentId, action: "evidence.deleted", entityType: "EvidenceAsset", entityId: asset.id, data: { storageKey: asset.storageKey } });
  });
  return { deleted: true };
}
