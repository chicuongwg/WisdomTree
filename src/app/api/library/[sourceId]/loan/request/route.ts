import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { requestLoan } from "@/modules/circulation/service";

// POST /api/library/{sourceId}/loan/request — 201 ticket, or 409 when the
// reader already holds one / no copy is left.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId } = await params;
    return NextResponse.json(await requestLoan(actor, sourceId), { status: 201 });
  });
}
