import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { triageGapRequest } from "@/modules/storage/curation";

// POST /api/source/gap-request/{requestId}/triage — Admin/Op marks triaged
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { requestId } = await params;
    return NextResponse.json(await triageGapRequest(actor, requestId));
  });
}
