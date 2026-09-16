import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createAppProjectActivity, listAppProjectActivities, toApplicationError } from "@/modules/application";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const activities = await listAppProjectActivities(actor, projectId);
    return NextResponse.json({ activities });
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
      type?: unknown;
      summary?: unknown;
    } | null;
    if (!body || typeof body.title !== "string") {
      throw new ApiError(400, "invalid_input", "Activity title is required.");
    }
    const activity = await createAppProjectActivity(actor, {
      projectId,
      title: body.title,
      type: typeof body.type === "string" ? body.type : null,
      summary: typeof body.summary === "string" ? body.summary : null,
    });
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
