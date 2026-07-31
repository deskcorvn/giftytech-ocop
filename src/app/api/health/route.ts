import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    const token = process.env.HEALTHCHECK_TOKEN;
    const authorized = !token || request.headers.get("authorization") === `Bearer ${token}`;
    return NextResponse.json({
      ok: true,
      service: "giftyid-ocop-platform",
      database: "reachable",
      latencyMs: Date.now() - startedAt,
      ...(authorized ? { version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local" } : {}),
    });
  } catch {
    return NextResponse.json({ ok: false, service: "giftyid-ocop-platform", database: "unreachable" }, { status: 503 });
  }
}
