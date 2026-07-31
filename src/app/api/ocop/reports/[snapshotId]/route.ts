import { handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getReportSnapshot } from "@/lib/services/report-service";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ snapshotId: string }> }) {
  return handleApi(async () => {
    await requireActor(["COORDINATOR", "ADMIN"]);
    return getReportSnapshot((await context.params).snapshotId);
  });
}
