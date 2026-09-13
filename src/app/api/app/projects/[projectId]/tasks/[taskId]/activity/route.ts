import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  attachAppTaskToActivity,
  detachAppTaskFromActivity,
  getAppProjectTask,
  toApplicationError,
} from "@/modules/application";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, taskId } = await params;
    const body = (await request.json().catch(() => null)) as {
      activityId?: unknown;
      expectedVersion?: unknown;
    } | null;
    if (!body || typeof body.activityId !== "string" || typeof body.expectedVersion !== "number") {
      throw new ApiError(400, "invalid_input", "Activity and Task version are required.");
    }
    await getAppProjectTask(actor, projectId, taskId);
    const task = await attachAppTaskToActivity(actor, {
      taskId,
      activityId: body.activityId,
      expectedVersion: body.expectedVersion,
    });
    return NextResponse.json({ task });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, taskId } = await params;
    const expectedVersion = Number(request.nextUrl.searchParams.get("expectedVersion"));
    if (!Number.isInteger(expectedVersion)) {
      throw new ApiError(400, "invalid_input", "Task version is required.");
    }
    await getAppProjectTask(actor, projectId, taskId);
    const task = await detachAppTaskFromActivity(actor, { taskId, expectedVersion });
    return NextResponse.json({ task });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
