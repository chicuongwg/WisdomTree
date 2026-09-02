import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  addAppDraftSupportingNoteVersion,
  removeAppDraftSupportingNoteVersion,
  toApplicationError,
} from "@/modules/application";
import { resolveExistingTargetDraft } from "../_lib";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    const { draftId } = await resolveExistingTargetDraft(actor, projectId, noteId);

    const body = (await request.json().catch(() => null)) as {
      noteVersionId?: unknown;
    } | null;

    if (!body || typeof body.noteVersionId !== "string" || !body.noteVersionId) {
      throw new ApiError(400, "invalid_input", "noteVersionId is required.");
    }

    await addAppDraftSupportingNoteVersion(actor, {
      draftId,
      noteVersionId: body.noteVersionId,
    });

    return NextResponse.json({ ok: true, noteVersionId: body.noteVersionId });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    const { draftId } = await resolveExistingTargetDraft(actor, projectId, noteId);

    const body = (await request.json().catch(() => null)) as {
      noteVersionId?: unknown;
    } | null;

    const noteVersionId =
      body && typeof body.noteVersionId === "string"
        ? body.noteVersionId
        : request.nextUrl.searchParams.get("noteVersionId");

    if (!noteVersionId) {
      throw new ApiError(400, "invalid_input", "noteVersionId is required.");
    }

    await removeAppDraftSupportingNoteVersion(actor, {
      draftId,
      noteVersionId,
    });

    return NextResponse.json({ ok: true, noteVersionId });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
