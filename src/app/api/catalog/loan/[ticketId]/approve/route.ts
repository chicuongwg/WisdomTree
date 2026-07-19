import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { approveLoan } from "@/modules/circulation/service";

// POST /api/catalog/loan/{ticketId}/approve — librarian
export async function POST(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { ticketId } = await params;
    return NextResponse.json(await approveLoan(actor, ticketId));
  });
}
