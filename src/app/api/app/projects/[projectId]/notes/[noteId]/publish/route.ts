import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  getAppDraft,
  publishAppDraft,
  toApplicationError,
} from "@/modules/application";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; noteId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, noteId } = await params;
    const body = (await request.json().catch(() => null)) as {
      draftId?: unknown;
    } | null;

    const draftId =
      typeof body?.draftId === "string" && body.draftId.trim()
        ? body.draftId.trim()
        : noteId;

    const draft = await getAppDraft(actor, draftId);
    if (draft.projectId !== projectId) {
      throw new ApiError(404, "not_found", "Draft not found in this Project.");
    }

    const result = await publishAppDraft(actor, draft.id);
    return NextResponse.json({
      nodeId: result.nodeId,
      version: result.version,
    });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
