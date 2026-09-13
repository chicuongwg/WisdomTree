import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { validateMarkdown } from "@/lib/markdown-validation";
import { requirePrincipal } from "@/lib/request";
import { wikiIndex } from "@/modules/knowledge/service";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as { contentMd?: string } | null;
    if (typeof body?.contentMd !== "string")
      throw new ApiError(400, "invalid_content", "Content is required.");
    const index = await wikiIndex(actor);
    return NextResponse.json({ issues: validateMarkdown(body.contentMd, Object.keys(index)) });
  });
}
