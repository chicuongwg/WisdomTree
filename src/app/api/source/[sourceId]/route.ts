import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getSourceDetail } from "@/modules/storage/service";

// GET /api/source/{sourceId} — 404 when outside the caller's visibility scope
export async function GET(_request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    return NextResponse.json(await getSourceDetail(actor, sourceId));
  });
}
