import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { searchAppResearch } from "@/modules/application";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const query = request.nextUrl.searchParams.get("q") ?? undefined;
    const type = request.nextUrl.searchParams.get("type");
    const results = await searchAppResearch(actor, {
      query,
      ...(type ? { types: [type as "project" | "note" | "material" | "activity" | "person"] } : {}),
      limit: 8,
    });
    return NextResponse.json(
      results.map((result) => ({
        kind: result.kind,
        id: result.id,
        title: result.title,
        summary: result.summary,
        ...(result.kind === "person" ? { projects: result.projects } : { project: result.project }),
      })),
    );
  });
}
