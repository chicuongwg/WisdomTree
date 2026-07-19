import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createTask } from "@/modules/pm/service";

// POST /api/tasks — create a board task (Editor, Admin/Op).
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) ?? {};
    const task = await createTask(actor, body);
    return NextResponse.json(task, { status: 201 });
  });
}
