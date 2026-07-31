import { ApiError, handleApi } from "@/lib/api/errors";
import { requireActor } from "@/lib/auth/session";
import { getTask } from "@/lib/services/journey-service";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ taskCode: string }> }) {
  return handleApi(async () => {
    const actor = await requireActor(["LEARNER"]);
    const { taskCode } = await context.params;
    const task = await getTask(actor, taskCode);
    if (!task) throw new ApiError(404, "task_not_found", "Không tìm thấy nhiệm vụ.");
    return task;
  });
}
