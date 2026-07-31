import { handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getMentorQueue } from "@/lib/services/review-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireActor(["MENTOR", "COORDINATOR", "ADMIN"]);
    return getMentorQueue(new URL(request.url).searchParams.get("cohortId") ?? undefined);
  });
}
