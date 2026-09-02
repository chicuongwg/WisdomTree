import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  addAppDraftSupportingSourceVersion,
  removeAppDraftSupportingSourceVersion,
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
      sourceVersionId?: unknown;
    } | null;

    if (!body || typeof body.sourceVersionId !== "string" || !body.sourceVersionId) {
      throw new ApiError(400, "invalid_input", "sourceVersionId is required.");
    }

    await addAppDraftSupportingSourceVersion(actor, {
      draftId,
      sourceVersionId: body.sourceVersionId,
    });

    return NextResponse.json({ ok: true, sourceVersionId: body.sourceVersionId });
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
      sourceVersionId?: unknown;
    } | null;

    const sourceVersionId =
      body && typeof body.sourceVersionId === "string"
        ? body.sourceVersionId
        : request.nextUrl.searchParams.get("sourceVersionId");

    if (!sourceVersionId) {
      throw new ApiError(400, "invalid_input", "sourceVersionId is required.");
    }

    await removeAppDraftSupportingSourceVersion(actor, {
      draftId,
      sourceVersionId,
    });

    return NextResponse.json({ ok: true, sourceVersionId });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
