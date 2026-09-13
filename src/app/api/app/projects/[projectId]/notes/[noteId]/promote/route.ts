import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { promoteAppPersonalNote, toApplicationError } from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    const body = (await request.json()) as { targetProjectId?: unknown };
    if (typeof body.targetProjectId !== "string") {
      throw new ApiError(400, "invalid_project", "A target Shared Project is required.");
    }
    const draft = await promoteAppPersonalNote(actor, {
      sourceProjectId: projectId,
      noteId,
      targetProjectId: body.targetProjectId,
    });
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
