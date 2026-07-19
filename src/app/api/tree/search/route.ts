import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { searchTree } from "@/modules/knowledge/service";

// GET /api/tree/search?q&page — full-text search over tree nodes (tsv)
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const params = request.nextUrl.searchParams;
    const q = params.get("q");
    if (!q?.trim()) throw new ApiError(400, "invalid_query", "Vui lòng nhập từ khóa tìm kiếm.");
    const page = params.get("page") ? Number(params.get("page")) : 1;
    return NextResponse.json(await searchTree(actor, q, page));
  });
}
