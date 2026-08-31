import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { searchKnowledge } from "@/modules/knowledge/service";

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const q = request.nextUrl.searchParams.get("q");
    if (!q?.trim()) throw new ApiError(400, "invalid_query", "A search query is required.");
    return NextResponse.json(
      await searchKnowledge(actor, q, request.nextUrl.searchParams.get("spaceId") || undefined),
    );
  });
}
