import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getPublishReview } from "@/modules/storage/curation";

// GET /api/review/publish/{reviewId} — publish-review workbench payload
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { reviewId } = await params;
    return NextResponse.json(await getPublishReview(actor, reviewId));
  });
}
