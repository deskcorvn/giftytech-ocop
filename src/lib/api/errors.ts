import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const payload = await request.json().catch(() => {
    throw new ApiError(400, "invalid_json", "Nội dung gửi lên không phải JSON hợp lệ.");
  });

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(400, "validation_failed", "Dữ liệu chưa hợp lệ.", parsed.error.flatten());
  }
  return parsed.data;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export async function handleApi<T>(handler: () => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    return ok(await handler(), status);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: { code: "validation_failed", message: "Dữ liệu chưa hợp lệ.", details: error.flatten() } },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: { code: "conflict", message: "Dữ liệu đã tồn tại hoặc yêu cầu bị trùng." } },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { ok: false, error: { code: "not_found", message: "Không tìm thấy dữ liệu yêu cầu." } },
        { status: 404 },
      );
    }
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    { ok: false, error: { code: "internal_error", message: "Hệ thống đang bận. Vui lòng thử lại." } },
    { status: 500 },
  );
}
