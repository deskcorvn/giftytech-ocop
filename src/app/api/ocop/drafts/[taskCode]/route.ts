import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { saveDraft } from "@/lib/services/learner-service";

export const runtime = "nodejs";

const DraftSchema = z.object({
  idempotencyKey: z.string().uuid(),
  expectedVersion: z.number().int().min(0),
  payload: z.record(z.string(), z.unknown()),
});

export async function PUT(request: Request, context: { params: Promise<{ taskCode: string }> }) {
  return handleApi(async () => {
    const actor = await requireActor(["LEARNER"]);
    const input = await parseJson(request, DraftSchema);
    const { taskCode } = await context.params;
    return saveDraft(actor, taskCode, input);
  });
}
