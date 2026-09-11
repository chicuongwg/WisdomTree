import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getAppActivity, toApplicationError, updateAppActivity } from "@/modules/application";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; activityId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, activityId } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      type?: unknown;
      summary?: unknown;
      status?: unknown;
      expectedVersion?: unknown;
    } | null;
    if (!body || typeof body.expectedVersion !== "number") {
      throw new ApiError(400, "invalid_input", "Activity version is required.");
    }
    const existing = await getAppActivity(actor, activityId);
    if (existing.projectId !== projectId) throw new ApiError(404, "not_found", "Activity not found.");
    const activity = await updateAppActivity(actor, {
      activityId,
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.type === "string" || body.type === null ? { activityType: body.type as string | null } : {}),
      ...(typeof body.summary === "string" || body.summary === null ? { summary: body.summary as string | null } : {}),
      ...(typeof body.status === "string" ? { status: body.status } : {}),
      expectedVersion: body.expectedVersion,
    });
    return NextResponse.json({ activity });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
