import { handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getJourney } from "@/lib/services/journey-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handleApi(async () => getJourney(await requireActor(["LEARNER"])));
}
