import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { updateConsent } from "@/lib/services/consent-service";

export const runtime = "nodejs";

const ConsentSchema = z.object({
  consentProcessing: z.literal(true),
  consentShowcase: z.boolean().default(false),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: Request) {
  return handleApi(async () => updateConsent(await requireActor(["LEARNER"]), await parseJson(request, ConsentSchema)));
}
