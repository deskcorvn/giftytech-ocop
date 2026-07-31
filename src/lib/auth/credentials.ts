import { compare } from "bcryptjs";
import { ApiError } from "@/lib/api/errors";
import { getPrisma } from "@/lib/db/prisma";

export async function verifyCredentials(username: string, password: string) {
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { username: username.trim().toLowerCase() },
    include: { credential: true },
  });
  if (!user || user.status !== "ACTIVE" || !user.credential || !(await compare(password, user.credential.passwordHash))) {
    throw new ApiError(401, "invalid_credentials", "Tài khoản hoặc mật khẩu không đúng.");
  }
  return user;
}
