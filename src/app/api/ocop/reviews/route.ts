import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { reviewSubmission } from "@/lib/services/review-service";

export const runtime = "nodejs";

const ReviewSchema = z.object({
  submissionId: z.string().cuid(),
  idempotencyKey: z.string().uuid(),
  decision: z.enum(["ACCEPT", "REVISION_REQUIRED", "REJECT"]),
  score: z.number().int().min(0).max(100).optional(),
  rubric: z.record(z.string(), z.unknown()).optional(),
  feedback: z.string().trim().min(10).max(5000),
  criticalFlags: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
});

export async function POST(request: Request) {
  return handleApi(async () => reviewSubmission(await requireActor(["MENTOR", "COORDINATOR", "ADMIN"]), await parseJson(request, ReviewSchema)), 201);
}
