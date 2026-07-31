import { handleApi } from "@/lib/api/errors";
import { revokeCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  return handleApi(async () => {
    await revokeCurrentSession();
    return { loggedOut: true };
  });
}
