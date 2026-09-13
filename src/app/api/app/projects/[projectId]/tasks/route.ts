import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppProjectTask, toApplicationError } from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      assigneeId?: unknown;
      activityId?: unknown;
      dueAt?: unknown;
      notes?: unknown;
    } | null;
    if (!body || typeof body.title !== "string") {
      throw new ApiError(400, "invalid_input", "Task title is required.");
    }
    const task = await createAppProjectTask(actor, {
      projectId,
      title: body.title,
      assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : null,
      activityId: typeof body.activityId === "string" ? body.activityId : null,
      dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });
    revalidatePath(`/app/projects/${projectId}/tasks`);
    revalidatePath("/app/my-work");
    revalidatePath("/app/calendar");
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
