import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  createAppCollaborationComment,
  listAppCollaborationComments,
  toApplicationError,
} from "@/modules/application";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { deadlineId } = await params;
    return NextResponse.json(
      await listAppCollaborationComments(actor, { kind: "deadline", entityId: deadlineId }),
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { deadlineId } = await params;
    const body = (await request.json().catch(() => null)) as {
      body?: unknown;
      parentCommentId?: unknown;
    } | null;
    if (!body || typeof body.body !== "string" || !body.body.trim()) {
      throw new ApiError(400, "invalid_comment", "Comment body must not be empty.");
    }
    if (body.parentCommentId !== undefined && typeof body.parentCommentId !== "string") {
      throw new ApiError(400, "invalid_parent_comment", "Invalid parent comment.");
    }
    return NextResponse.json(
      await createAppCollaborationComment(actor, {
        kind: "deadline",
        entityId: deadlineId,
        body: body.body.trim(),
        ...(typeof body.parentCommentId === "string"
          ? { parentCommentId: body.parentCommentId }
          : {}),
      }),
      { status: 201 },
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
