import { z } from "zod";
import { handleApi, parseJson } from "@/lib/api/errors";
import { verifyCredentials } from "@/lib/auth/credentials";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  return handleApi(async () => {
    const input = await parseJson(request, LoginSchema);
    const user = await verifyCredentials(input.username, input.password);
    await createSession(user.id);
    return { user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } };
  });
}
