import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { saveDraft } from "@/modules/storage/curation";

// POST .../md-draft — create/update the Markdown draft (optimistic-locked, 409)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    const body = (await request.json().catch(() => null)) as {
      contentMd?: string;
      suggestedBranchId?: string;
      expectedVersion?: number;
    } | null;
    if (typeof body?.contentMd !== "string" || !body.contentMd.trim()) {
      throw new ApiError(400, "invalid_draft", "Vui lòng nhập nội dung bản thảo.");
    }
    const draft = await saveDraft(actor, sourceId, versionId, {
      contentMd: body.contentMd,
      suggestedBranchId: body.suggestedBranchId,
      expectedVersion: typeof body.expectedVersion === "number" ? body.expectedVersion : undefined,
    });
    return NextResponse.json(draft);
  });
}
