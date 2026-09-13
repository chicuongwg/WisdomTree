import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  createAppCollaborationComment,
  listAppCollaborationComments,
  toApplicationError,
} from "@/modules/application";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, taskId } = await params;
    return NextResponse.json(
      await listAppCollaborationComments(actor, { kind: "task", projectId, entityId: taskId }),
    );
  } catch (error) {
    const app = toApplicationError(error);
    return NextResponse.json(app, { status: app.status });
  }
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, taskId } = await params;
    const body = (await request.json().catch(() => null)) as {
      body?: unknown;
      parentCommentId?: unknown;
    } | null;
    if (
      !body ||
      typeof body.body !== "string" ||
      !body.body.trim() ||
      (body.parentCommentId !== undefined && typeof body.parentCommentId !== "string")
    )
      throw new ApiError(400, "invalid_comment", "Invalid comment.");
    return NextResponse.json(
      await createAppCollaborationComment(actor, {
        kind: "task",
        projectId,
        entityId: taskId,
        body: body.body.trim(),
        ...(typeof body.parentCommentId === "string"
          ? { parentCommentId: body.parentCommentId }
          : {}),
      }),
      { status: 201 },
    );
  } catch (error) {
    const app = toApplicationError(error);
    return NextResponse.json(app, { status: app.status });
  }
}
