import { ApiError, handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { uploadEvidence } from "@/lib/services/evidence-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleApi(async () => {
    const actor = await requireActor(["LEARNER"]);
    const form = await request.formData();
    const file = form.get("file");
    const taskCode = String(form.get("taskCode") ?? "").trim();
    const evidenceCode = String(form.get("evidenceCode") ?? "").trim();
    const idempotencyKey = String(form.get("idempotencyKey") ?? "").trim();
    if (!(file instanceof File)) throw new ApiError(400, "file_required", "Vui lòng chọn tệp minh chứng.");
    if (!taskCode || !/^EV\d{2}$/.test(evidenceCode) || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
      throw new ApiError(400, "invalid_upload_request", "Thông tin upload chưa hợp lệ.");
    }
    return uploadEvidence(actor, { taskCode, evidenceCode, idempotencyKey, file });
  }, 201);
}
