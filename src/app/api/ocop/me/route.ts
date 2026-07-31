import { handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getPrisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    const actor = await requireActor();
    const enrollments = actor.role === "LEARNER"
      ? await getPrisma().enrollment.findMany({
          where: { userId: actor.id },
          select: { id: true, status: true, organizationName: true, productName: true, cohort: { select: { id: true, code: true, name: true, status: true } } },
          orderBy: { enrolledAt: "desc" },
        })
      : [];
    return { user: actor, enrollments };
  });
}
