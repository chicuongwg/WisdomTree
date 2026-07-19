import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listLibrary } from "@/modules/storage/service";

// GET /api/library?spaceId&q&page — space-scoped store-first Library
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const params = request.nextUrl.searchParams;
    const items = await listLibrary(actor, {
      spaceId: params.get("spaceId") ?? undefined,
      q: params.get("q") ?? undefined,
      page: params.get("page") ? Number(params.get("page")) : undefined,
    });
    return NextResponse.json(items);
  });
}
