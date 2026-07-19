import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { rejectCuration } from "@/modules/storage/curation";

// POST .../reject — Admin/Op closes curation as rejected; item stays stored
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    return NextResponse.json(await rejectCuration(actor, sourceId, versionId));
  });
}
