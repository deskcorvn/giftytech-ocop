import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { submitTask } from "@/lib/services/learner-service";

export const runtime = "nodejs";

const SubmissionSchema = z.object({
  taskCode: z.string().trim().min(1).max(100),
  idempotencyKey: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  payload: z.record(z.string(), z.unknown()),
  evidenceAssetIds: z.array(z.string().cuid()).max(10).default([]),
});

export async function POST(request: Request) {
  return handleApi(async () => submitTask(await requireActor(["LEARNER"]), await parseJson(request, SubmissionSchema)), 201);
}
