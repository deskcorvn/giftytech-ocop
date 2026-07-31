import { ApiError } from "@/lib/api/errors";

export type DynamicField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "url" | "number" | "checkbox";
  required?: boolean;
  minLength?: number;
  min?: number;
};

export function validateTaskPayload(fieldSchema: unknown, payload: Record<string, unknown>): void {
  if (!Array.isArray(fieldSchema)) {
    throw new ApiError(500, "invalid_curriculum", "Cấu hình biểu mẫu nhiệm vụ không hợp lệ.");
  }

  const errors: Record<string, string> = {};
  for (const rawField of fieldSchema) {
    if (!rawField || typeof rawField !== "object") continue;
    const field = rawField as DynamicField;
    const value = payload[field.key];
    const required = field.required !== false;

    if (required && (value === undefined || value === null || value === "" || value === false)) {
      errors[field.key] = `${field.label} là thông tin bắt buộc.`;
      continue;
    }
    if (!required && (value === undefined || value === null || value === "")) continue;

    if ((field.kind === "text" || field.kind === "textarea") && typeof value !== "string") {
      errors[field.key] = `${field.label} phải là văn bản.`;
    } else if (
      (field.kind === "text" || field.kind === "textarea") &&
      String(value).trim().length < (field.minLength ?? 1)
    ) {
      errors[field.key] = `${field.label} cần ít nhất ${field.minLength ?? 1} ký tự.`;
    } else if (field.kind === "url") {
      try {
        const url = new URL(String(value));
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error("invalid protocol");
      } catch {
        errors[field.key] = `${field.label} phải là URL http/https hợp lệ.`;
      }
    } else if (field.kind === "number" && (typeof value !== "number" || value < (field.min ?? 0))) {
      errors[field.key] = `${field.label} phải từ ${field.min ?? 0} trở lên.`;
    } else if (field.kind === "checkbox" && value !== true) {
      errors[field.key] = `Cần xác nhận: ${field.label}.`;
    }
  }

  const waitingMarker = "CHỜ XÁC THỰC";
  for (const [key, value] of Object.entries(payload)) {
    if (["facebookPost", "zaloPost", "profileSummary"].includes(key) && String(value).toUpperCase().includes(waitingMarker)) {
      errors[key] = `Nội dung công khai không được chứa dữ liệu “${waitingMarker}”.`;
    }
  }

  if (Object.keys(errors).length) {
    throw new ApiError(422, "task_validation_failed", "Đầu ra chưa đạt điều kiện nộp.", errors);
  }
}
