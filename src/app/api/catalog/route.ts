import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listCatalog } from "@/modules/catalog/service";

// GET /api/catalog?q&page — physical catalog, library-space members
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const params = request.nextUrl.searchParams;
    const items = await listCatalog(actor, {
      q: params.get("q") ?? undefined,
      page: params.get("page") ? Number(params.get("page")) : undefined,
    });
    return NextResponse.json(items);
  });
}
