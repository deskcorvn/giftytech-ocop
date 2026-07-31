import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { issueCertificate } from "@/lib/services/certificate-service";

export const runtime = "nodejs";

const CertificateSchema = z.object({ enrollmentId: z.string().cuid(), idempotencyKey: z.string().uuid() });

export async function POST(request: Request) {
  return handleApi(async () => issueCertificate(await requireActor(["MENTOR", "COORDINATOR", "ADMIN"]), await parseJson(request, CertificateSchema)), 201);
}
