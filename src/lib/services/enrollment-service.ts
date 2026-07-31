import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import type { Actor } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export async function getLearnerEnrollment(actor: Actor) {
  const db = getPrisma();
  const enrollment = await db.enrollment.findFirst({
    where: { userId: actor.id, status: { in: ["ACTIVE", "PAUSED", "COMPLETED"] } },
    orderBy: { enrolledAt: "desc" },
  });
  if (!enrollment) throw new ApiError(404, "enrollment_not_found", "Tài khoản chưa được gán vào lớp học.");
  return enrollment;
}

export async function requireEnrollmentAccess(actor: Actor, enrollmentId: string) {
  const db = getPrisma();
  const enrollment = await db.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) throw new ApiError(404, "enrollment_not_found", "Không tìm thấy hồ sơ học viên.");
  if (actor.role === "LEARNER" && enrollment.userId !== actor.id) {
    throw new ApiError(403, "forbidden", "Bạn không có quyền truy cập hồ sơ này.");
  }
  return enrollment;
}

export async function learnerEnrollmentInTransaction(tx: Prisma.TransactionClient, actor: Actor) {
  const enrollment = await tx.enrollment.findFirst({
    where: {
      userId: actor.id,
      status: { in: ["ACTIVE", "PAUSED"] },
      cohort: { status: { in: ["OPEN", "ACTIVE"] } },
    },
    orderBy: { enrolledAt: "desc" },
  });
  if (!enrollment) throw new ApiError(404, "enrollment_not_found", "Tài khoản chưa có lớp học đang hoạt động.");
  if (!enrollment.consentProcessing) {
    throw new ApiError(403, "consent_required", "Học viên cần xác nhận đồng ý xử lý dữ liệu trước khi nộp bài.");
  }
  return enrollment;
}
