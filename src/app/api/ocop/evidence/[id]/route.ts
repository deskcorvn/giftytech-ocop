import { requireActor } from "@/lib/auth/session";
import { toErrorResponse } from "@/lib/api/errors";
import { deleteEvidence, streamEvidence } from "@/lib/services/evidence-service";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor();
    const { id } = await context.params;
    const evidence = await streamEvidence(actor, id);
    return new Response(evidence.stream, {
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Length": String(evidence.sizeBytes),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(evidence.filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor();
    const { id } = await context.params;
    return Response.json({ ok: true, data: await deleteEvidence(actor, id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
