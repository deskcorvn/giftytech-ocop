import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { updateCohortStatus } from "@/lib/services/cohort-service";

export const runtime = "nodejs";

const StatusSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "ACTIVE", "CLOSED", "ARCHIVED"]),
  idempotencyKey: z.string().uuid(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const actor = await requireActor(["COORDINATOR", "ADMIN"]);
    return updateCohortStatus(actor, (await context.params).id, await parseJson(request, StatusSchema));
  });
}
