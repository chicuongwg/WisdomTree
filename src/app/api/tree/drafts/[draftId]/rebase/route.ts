import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { rebaseDraft } from "@/modules/knowledge/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { draftId } = await params;
    const body = await request.json();
    return NextResponse.json(
      await rebaseDraft(actor, draftId, {
        title: body.title,
        summary: body.summary,
        sortOrder: body.sortOrder ?? 0,
        contentMd: body.contentMd ?? "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        links: Array.isArray(body.links) ? body.links : [],
        expectedOfficialVersion: body.expectedOfficialVersion,
        expectedDraftVersion: body.expectedDraftVersion,
      }),
    );
  });
}
