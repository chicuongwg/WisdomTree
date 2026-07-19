import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { rejectGapRequest } from "@/modules/storage/curation";

// POST .../reject — Admin/Op rejects a gap request
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { requestId } = await params;
    return NextResponse.json(await rejectGapRequest(actor, requestId));
  });
}
