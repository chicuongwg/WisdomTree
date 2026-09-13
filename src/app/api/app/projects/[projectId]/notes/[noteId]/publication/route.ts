import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  getAppProjectNote,
  publishAppNote,
  toApplicationError,
  unpublishAppNote,
} from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    await getAppProjectNote(actor, projectId, noteId);
    const body = (await request.json().catch(() => null)) as { publicSlug?: unknown } | null;
    if (body?.publicSlug !== undefined && typeof body.publicSlug !== "string") {
      throw new ApiError(400, "invalid_input", "Public slug must be text.");
    }
    return NextResponse.json(
      await publishAppNote(actor, {
        noteId,
        ...(typeof body?.publicSlug === "string" && body.publicSlug.trim()
          ? { publicSlug: body.publicSlug.trim() }
          : {}),
      }),
    );
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    await getAppProjectNote(actor, projectId, noteId);
    return NextResponse.json(await unpublishAppNote(actor, noteId));
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
