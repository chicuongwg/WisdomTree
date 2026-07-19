import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { requestLoan } from "@/modules/circulation/service";

// POST /api/catalog/{itemId}/loan/request — 201 ticket, or 409 when the item
// already has an active loan (index violation mapped to the Error shape).
export async function POST(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { itemId } = await params;
    return NextResponse.json(await requestLoan(actor, itemId), { status: 201 });
  });
}
