import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { discardDraft, getDraft, updateDraft } from "@/modules/knowledge/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { draftId } = await params;
    return NextResponse.json(await getDraft(actor, draftId));
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { draftId } = await params;
    const body = await request.json();
    return NextResponse.json(
      await updateDraft(actor, draftId, {
        title: body.title,
        summary: body.summary,
        sortOrder: body.sortOrder ?? 0,
        contentMd: body.contentMd ?? "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        links: Array.isArray(body.links) ? body.links : [],
        expectedDraftVersion: body.expectedDraftVersion,
      }),
    );
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { draftId } = await params;
    await discardDraft(actor, draftId);
    return new NextResponse(null, { status: 204 });
  });
}
