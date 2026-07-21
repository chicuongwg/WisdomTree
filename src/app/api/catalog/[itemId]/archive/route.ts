import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { archiveCatalogItem } from "@/modules/catalog/service";

// POST /api/catalog/:itemId/archive — off the shelf list, still on record.
// Librarian only; 409 while a copy is still out; idempotent, so always 204.
export async function POST(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { itemId } = await params;
    await archiveCatalogItem(actor, itemId);
    return new NextResponse(null, { status: 204 });
  });
}
