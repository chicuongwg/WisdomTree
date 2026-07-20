import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { listLibrary } from "@/modules/storage/service";

// GET /api/library?spaceId&q&page&folderId&sort&dir — space-scoped
// store-first Library; folderId="" means the space root
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const params = request.nextUrl.searchParams;
    const folderId = params.get("folderId");
    const sort = params.get("sort");
    const dir = params.get("dir");
    const items = await listLibrary(actor, {
      spaceId: params.get("spaceId") ?? undefined,
      q: params.get("q") ?? undefined,
      page: params.get("page") ? Number(params.get("page")) : undefined,
      folderId: folderId === null ? undefined : folderId === "" ? null : folderId,
      sort: sort === "title" || sort === "storedAt" ? sort : undefined,
      dir: dir === "asc" || dir === "desc" ? dir : undefined,
    });
    return NextResponse.json(items);
  });
}
