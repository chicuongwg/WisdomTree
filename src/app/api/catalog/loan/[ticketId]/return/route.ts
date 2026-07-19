import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { returnLoan } from "@/modules/circulation/service";

// POST /api/catalog/loan/{ticketId}/return — librarian; item back to available
export async function POST(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { ticketId } = await params;
    return NextResponse.json(await returnLoan(actor, ticketId));
  });
}
