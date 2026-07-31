import { createHash, randomBytes } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { getPrisma } from "@/lib/db/prisma";

export const SESSION_COOKIE_NAME = "ocop_session";

export type Actor = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
};

function sessionDurationSeconds(): number {
  const parsed = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS ?? 604800);
  return Number.isInteger(parsed) && parsed >= 3600 ? parsed : 604800;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const db = getPrisma();
  const token = randomBytes(32).toString("base64url");
  const maxAge = sessionDurationSeconds();
  const requestHeaders = await headers();

  await db.session.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + maxAge * 1000),
      userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const db = getPrisma();
    await db.session.updateMany({
      where: { tokenHash: tokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.set(SESSION_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
}

export async function getActor(): Promise<Actor | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getPrisma();
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;

  return {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    role: session.user.role,
  };
}

export async function requireActor(allowedRoles?: UserRole[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new ApiError(401, "unauthorized", "Vui lòng đăng nhập để tiếp tục.");
  if (allowedRoles && !allowedRoles.includes(actor.role)) {
    throw new ApiError(403, "forbidden", "Tài khoản không có quyền thực hiện thao tác này.");
  }
  return actor;
}
