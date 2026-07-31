import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { createIncident } from "@/lib/services/report-service";

export const runtime = "nodejs";

const IncidentSchema = z.object({
  cohortId: z.string().cuid(),
  enrollmentId: z.string().cuid().optional(),
  severity: z.enum(["S1", "S2", "S3", "S4"]),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(5000),
  assignedToId: z.string().cuid().optional(),
  idempotencyKey: z.string().uuid(),
});

export async function POST(request: Request) {
  return handleApi(async () => createIncident(await requireActor(), await parseJson(request, IncidentSchema)), 201);
}
