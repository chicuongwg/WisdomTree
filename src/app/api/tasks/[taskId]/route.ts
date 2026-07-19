import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { updateTask } from "@/modules/pm/service";

// PATCH /api/tasks/:taskId — owned-or-assigned for Editors; expectedVersion.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { taskId } = await params;
    const body = (await request.json().catch(() => null)) ?? {};
    return NextResponse.json(await updateTask(actor, taskId, body));
  });
}
