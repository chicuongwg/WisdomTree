import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { markReadyForReview } from "@/modules/storage/curation";

// POST .../mark-ready-for-review — curation → ready_for_review
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    return NextResponse.json(await markReadyForReview(actor, sourceId, versionId));
  });
}
