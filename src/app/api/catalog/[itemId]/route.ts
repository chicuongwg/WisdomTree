import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getCatalogItem, updateCatalogItemCopies } from "@/modules/catalog/service";

// GET /api/catalog/{itemId} — detail including active loan; out of scope → 404
export async function GET(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { itemId } = await params;
    return NextResponse.json(await getCatalogItem(actor, itemId));
  });
}

// PATCH /api/catalog/{itemId} — Admin/Op corrects the copy count (catalog.item.manage)
export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { itemId } = await params;
    const body = (await request.json()) as { copies?: unknown };
    return NextResponse.json(await updateCatalogItemCopies(actor, itemId, body));
  });
}
