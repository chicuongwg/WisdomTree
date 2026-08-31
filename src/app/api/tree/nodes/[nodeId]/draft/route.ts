import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getMyNodeDraft, saveNodeDraft, type DraftLocale } from "@/modules/knowledge/service";

const localeOf = (request: NextRequest): DraftLocale =>
  request.nextUrl.searchParams.get("locale") === "en" ? "en" : "vi";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    return NextResponse.json(await getMyNodeDraft(actor, nodeId, localeOf(request)));
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const body = await request.json();
    return NextResponse.json(
      await saveNodeDraft(actor, nodeId, localeOf(request), {
        title: body.title,
        summary: body.summary,
        sortOrder: body.sortOrder ?? 0,
        contentMd: body.contentMd ?? "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        links: Array.isArray(body.links) ? body.links : [],
        baseVersion: body.baseVersion,
        expectedDraftVersion: body.expectedDraftVersion,
      }),
    );
  });
}
