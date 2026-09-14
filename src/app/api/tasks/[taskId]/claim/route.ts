import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { claimTask } from "@/modules/pm/service";

// POST /api/tasks/:taskId/claim — take an unassigned task (every role).
// 409 already_claimed if someone got there first; 404 if there is no such task.
export async function POST(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { taskId } = await params;
    const task = await claimTask(actor, taskId);
    revalidatePath("/app/my-work");
    return NextResponse.json(task);
  });
}
