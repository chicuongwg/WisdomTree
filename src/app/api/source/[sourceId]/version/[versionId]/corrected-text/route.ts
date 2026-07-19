import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { appendCorrectedText } from "@/modules/storage/curation";

// POST .../corrected-text — append a corrected-text revision (201)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    const body = (await request.json().catch(() => null)) as { content?: string } | null;
    if (typeof body?.content !== "string" || !body.content.trim()) {
      throw new ApiError(400, "invalid_content", "Vui lòng nhập nội dung hiệu đính.");
    }
    const created = await appendCorrectedText(actor, sourceId, versionId, body.content);
    return NextResponse.json(created, { status: 201 });
  });
}
