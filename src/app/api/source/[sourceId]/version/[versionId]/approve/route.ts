import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { approveCuration } from "@/modules/storage/curation";

// POST .../approve — Admin/Op approves corrected text / draft for publication
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    return NextResponse.json(await approveCuration(actor, sourceId, versionId));
  });
}
