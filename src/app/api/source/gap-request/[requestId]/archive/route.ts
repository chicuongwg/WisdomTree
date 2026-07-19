import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { archiveGapRequest } from "@/modules/storage/curation";

// POST .../archive — Admin/Op archives a resolved gap request
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { requestId } = await params;
    return NextResponse.json(await archiveGapRequest(actor, requestId));
  });
}
