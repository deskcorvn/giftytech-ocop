import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { createCohort, listCohorts } from "@/lib/services/cohort-service";

export const runtime = "nodejs";

const CohortSchema = z.object({
  programCode: z.string().trim().min(2).max(80),
  programVersion: z.number().int().positive(),
  code: z.string().trim().min(3).max(80).regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(5).max(200),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  baselineCount: z.number().int().positive().max(10000).optional(),
  idempotencyKey: z.string().uuid(),
});

export async function GET() {
  return handleApi(async () => {
    await requireActor(["COORDINATOR", "ADMIN"]);
    return listCohorts();
  });
}

export async function POST(request: Request) {
  return handleApi(async () => createCohort(await requireActor(["COORDINATOR", "ADMIN"]), await parseJson(request, CohortSchema)), 201);
}
