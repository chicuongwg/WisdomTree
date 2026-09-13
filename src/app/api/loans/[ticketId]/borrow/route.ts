import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { borrowLoan } from "@/modules/circulation/service";

// POST /api/loans/{ticketId}/borrow — librarian; body { dueAt }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { ticketId } = await params;
    const body = (await request.json().catch(() => ({}))) as { dueAt?: string };
    if (!body.dueAt)
      throw new ApiError(400, "invalid_due_date", "Please provide a valid due date.");
    return NextResponse.json(await borrowLoan(actor, ticketId, new Date(body.dueAt)));
  });
}
