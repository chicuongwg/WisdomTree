import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppProjectTask, listAppProjectActivities, listAppProjectTaskAssignees, listAppProjectTasks, toApplicationError } from "@/modules/application";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const [tasks, activities, assignees] = await Promise.all([
      listAppProjectTasks(actor, projectId),
      listAppProjectActivities(actor, projectId),
      listAppProjectTaskAssignees(actor, projectId),
    ]);
    return NextResponse.json({ tasks, activities, assignees });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      state?: unknown;
      priority?: unknown;
      kind?: unknown;
      sprint?: unknown;
      estimatePoints?: unknown;
      assigneeId?: unknown;
      activityId?: unknown;
      dueAt?: unknown;
      startAt?: unknown;
      notes?: unknown;
    } | null;
    if (!body || typeof body.title !== "string") {
      throw new ApiError(400, "invalid_input", "Task title is required.");
    }
    const task = await createAppProjectTask(actor, {
      projectId,
      title: body.title,
      state: typeof body.state === "string" ? body.state : undefined,
      priority: typeof body.priority === "string" ? (body.priority as any) : undefined,
      kind: typeof body.kind === "string" ? (body.kind as any) : undefined,
      sprint: typeof body.sprint === "string" ? body.sprint : null,
      estimatePoints: typeof body.estimatePoints === "number" ? body.estimatePoints : null,
      assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : null,
      activityId: typeof body.activityId === "string" ? body.activityId : null,
      startAt: typeof body.startAt === "string" && body.startAt ? body.startAt : null,
      dueAt: typeof body.dueAt === "string" && body.dueAt ? body.dueAt : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });
    revalidatePath("/app");
    revalidatePath("/app/my-work");
    revalidatePath("/app/calendar");
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath(`/app/projects/${projectId}/tasks`);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
