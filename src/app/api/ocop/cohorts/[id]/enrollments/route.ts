import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";
import { enrollLearner } from "@/lib/services/cohort-service";

export const runtime = "nodejs";

const EnrollmentSchema = z.object({
  username: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(4).max(150),
  password: z.string().min(12).max(200).optional(),
  organizationName: z.string().trim().min(3).max(250),
  productName: z.string().trim().min(3).max(250),
  province: z.string().trim().min(2).max(100),
  primaryChannel: z.string().trim().min(2).max(100).optional(),
  consentProcessing: z.boolean().default(false),
  consentShowcase: z.boolean().optional(),
  idempotencyKey: z.string().uuid(),
});

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    await requireActor(["COORDINATOR", "ADMIN"]);
    const { id } = await context.params;
    return getPrisma().enrollment.findMany({
      where: { cohortId: id },
      select: { id: true, status: true, organizationName: true, productName: true, province: true, enrolledAt: true, completedAt: true, user: { select: { id: true, username: true, displayName: true, status: true } } },
      orderBy: { enrolledAt: "asc" },
    });
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const actor = await requireActor(["COORDINATOR", "ADMIN"]);
    const { id } = await context.params;
    return enrollLearner(actor, id, await parseJson(request, EnrollmentSchema));
  }, 201);
}
