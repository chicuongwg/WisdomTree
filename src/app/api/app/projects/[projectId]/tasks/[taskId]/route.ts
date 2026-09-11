import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { toApplicationError, updateAppProjectTask } from "@/modules/application";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, taskId } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      state?: unknown;
      assigneeId?: unknown;
      dueAt?: unknown;
      notes?: unknown;
      expectedVersion?: unknown;
    } | null;
    if (!body || typeof body.expectedVersion !== "number") {
      throw new ApiError(400, "invalid_input", "Task version is required.");
    }
    const task = await updateAppProjectTask(actor, projectId, taskId, {
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.state === "string" ? { state: body.state } : {}),
      ...(typeof body.assigneeId === "string" || body.assigneeId === null ? { assigneeId: body.assigneeId as string | null } : {}),
      ...(typeof body.dueAt === "string" || body.dueAt === null ? { dueAt: body.dueAt as string | null } : {}),
      ...(typeof body.notes === "string" || body.notes === null ? { notes: body.notes as string | null } : {}),
      expectedVersion: body.expectedVersion,
    });
    return NextResponse.json({ task });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
