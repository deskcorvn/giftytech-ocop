import { z } from "zod";
import { ApiError, handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { decideGate } from "@/lib/services/gate-service";

export const runtime = "nodejs";

const GateSchema = z.object({
  enrollmentId: z.string().cuid(),
  idempotencyKey: z.string().uuid(),
  status: z.enum(["NOT_READY", "CONDITIONAL", "REVISION_REQUIRED", "ACCEPTED"]),
  reason: z.string().trim().min(10).max(3000),
  score: z.number().int().min(0).max(100).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ gateCode: string }> }) {
  return handleApi(async () => {
    const actor = await requireActor(["MENTOR", "COORDINATOR", "ADMIN"]);
    const { gateCode } = await context.params;
    if (!/^(G0|G1|G2|G3|G4)$/.test(gateCode)) throw new ApiError(400, "invalid_gate", "Mã gate không hợp lệ.");
    return decideGate(actor, gateCode as "G0" | "G1" | "G2" | "G3" | "G4", await parseJson(request, GateSchema));
  }, 201);
}
