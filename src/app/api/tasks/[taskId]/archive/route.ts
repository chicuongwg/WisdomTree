import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { archiveTask } from "@/modules/pm/service";

// POST /api/tasks/:taskId/archive — off the board, still in the record.
// Creator or holder (or Admin/Op); idempotent, so always 204.
export async function POST(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { taskId } = await params;
    await archiveTask(actor, taskId);
    return new NextResponse(null, { status: 204 });
  });
}
