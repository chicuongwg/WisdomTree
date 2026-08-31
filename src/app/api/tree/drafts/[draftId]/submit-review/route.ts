import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { submitDraftForReview } from "@/modules/knowledge/service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { draftId } = await params;
    return NextResponse.json(await submitDraftForReview(actor, draftId), { status: 201 });
  });
}
