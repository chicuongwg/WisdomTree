import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createTeamDraft } from "@/modules/knowledge/service";

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = await request.json();
    return NextResponse.json(
      await createTeamDraft(actor, {
        branchId: body.branchId,
        locale: body.locale,
        title: body.title,
        summary: body.summary,
        sortOrder: body.sortOrder ?? 0,
        contentMd: body.contentMd ?? "",
        tags: Array.isArray(body.tags) ? body.tags : [],
        links: Array.isArray(body.links) ? body.links : [],
      }),
      { status: 201 },
    );
  });
}
