import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { searchIndex } from "@/modules/index/service";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query) throw new ApiError(400, "invalid_query", "Vui lòng nhập truy vấn.");
    const source = request.nextUrl.searchParams.get("source");
    return NextResponse.json(
      await searchIndex(actor, {
        query,
        vaultId: request.nextUrl.searchParams.get("vaultId") ?? undefined,
        source:
          source === "notes" || source === "documents" || source === "all" ? source : "all",
      }),
    );
  });
}
