import { handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getCoordinatorDashboard } from "@/lib/services/report-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleApi(async () => {
    await requireActor(["COORDINATOR", "ADMIN"]);
    return getCoordinatorDashboard(new URL(request.url).searchParams.get("cohortId") ?? undefined);
  });
}
