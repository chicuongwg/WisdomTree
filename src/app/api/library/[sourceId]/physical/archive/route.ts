import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { archivePhysicalItem } from "@/modules/storage/physical";

// POST /api/library/{sourceId}/physical/archive — off the shelf, on record.
// 409 while a copy is still out; idempotent, so always 204.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    await archivePhysicalItem(actor, sourceId);
    return new NextResponse(null, { status: 204 });
  });
}
