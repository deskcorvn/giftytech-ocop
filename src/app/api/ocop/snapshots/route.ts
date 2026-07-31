import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { createReportSnapshot } from "@/lib/services/report-service";

export const runtime = "nodejs";

const SnapshotSchema = z.object({
  cohortId: z.string().cuid(),
  kind: z.enum(["D7", "D30", "FINAL"]),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: Request) {
  return handleApi(async () => createReportSnapshot(await requireActor(["COORDINATOR", "ADMIN"]), await parseJson(request, SnapshotSchema)), 201);
}
