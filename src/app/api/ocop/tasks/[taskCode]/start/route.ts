import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { startTask } from "@/lib/services/learner-service";

export const runtime = "nodejs";

const StartSchema = z.object({
  idempotencyKey: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
});

export async function POST(request: Request, context: { params: Promise<{ taskCode: string }> }) {
  return handleApi(async () => {
    const actor = await requireActor(["LEARNER"]);
    const input = await parseJson(request, StartSchema);
    const { taskCode } = await context.params;
    return startTask(actor, taskCode, input);
  });
}
