import { handleApi } from "@/lib/api/errors";
import { getPublicCertificate } from "@/lib/services/certificate-service";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ publicId: string }> }) {
  return handleApi(async () => getPublicCertificate((await context.params).publicId));
}
