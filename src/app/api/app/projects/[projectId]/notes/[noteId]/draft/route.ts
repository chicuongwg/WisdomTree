import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  getAppDraft,
  getAppProjectNote,
  saveAppNoteDraft,
  toApplicationError,
  updateAppDraft,
} from "@/modules/application";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
      summary?: unknown;
      contentMd?: unknown;
      researchPurpose?: unknown;
      expectedVersion?: unknown;
      baseVersion?: unknown;
    } | null;

    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      throw new ApiError(400, "invalid_input", "Note title is required.");
    }
    if (typeof body.contentMd !== "string") {
      throw new ApiError(400, "invalid_input", "Markdown content is required.");
    }
    if (typeof body.expectedVersion !== "number" || body.expectedVersion < 0) {
      throw new ApiError(400, "invalid_input", "Valid expectedVersion is required.");
    }
    if (
      body.researchPurpose !== undefined &&
      body.researchPurpose !== null &&
      body.researchPurpose !== "evidence" &&
      body.researchPurpose !== "synthesis"
    ) {
      throw new ApiError(400, "invalid_input", "Research purpose is invalid.");
    }

    const title = body.title.trim();
    const summary = typeof body.summary === "string" ? body.summary.trim() || null : null;
    const contentMd = body.contentMd;
    const expectedVersion = body.expectedVersion;
    const baseVersion = typeof body.baseVersion === "number" ? body.baseVersion : 1;
    const researchPurpose = body.researchPurpose as "evidence" | "synthesis" | null | undefined;

    let isOfficialNote = false;
    try {
      await getAppProjectNote(actor, projectId, noteId);
      isOfficialNote = true;
    } catch (err) {
      const appErr = toApplicationError(err);
      if (appErr.error !== "not_found") throw err;
    }

    if (isOfficialNote) {
      const draft = await saveAppNoteDraft(actor, {
        projectId,
        noteId,
        title,
        summary,
        contentMd,
        researchPurpose,
        baseVersion,
        expectedVersion,
      });

      return NextResponse.json({ draft });
    } else {
      const existing = await getAppDraft(actor, noteId);
      if (existing.projectId !== projectId) {
        throw new ApiError(404, "not_found", "Draft not found in this Project.");
      }

      const draft = await updateAppDraft(actor, noteId, {
        title,
        summary,
        contentMd,
        sortOrder: 0,
        tags: [],
        links: [],
        researchPurpose,
        expectedVersion,
      });

      return NextResponse.json({ draft });
    }
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
