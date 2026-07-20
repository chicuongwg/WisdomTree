import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getTask, updateTask } from "@/modules/pm/service";

// GET /api/tasks/:taskId — one task with everything its own page shows.
// pm.board.read, the same key the board itself carries: a detail nobody could
// open would only hide what the card beside it already announces.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { taskId } = await params;
    return NextResponse.json(await getTask(actor, taskId));
  });
}

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
