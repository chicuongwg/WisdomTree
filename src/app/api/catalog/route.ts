import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createCatalogItem, listCatalog } from "@/modules/catalog/service";

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

// POST /api/catalog — Admin/Op adds a physical item (catalog.item.manage)
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json()) as {
      title?: string;
      author?: string;
      location?: string;
      spaceId?: string;
    };
    return NextResponse.json(await createCatalogItem(actor, body), { status: 201 });
  });
}
