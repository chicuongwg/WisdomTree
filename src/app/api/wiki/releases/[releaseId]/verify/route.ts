import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { verifySpaceRelease } from "@/modules/export/service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ releaseId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { releaseId } = await params;
    return NextResponse.json(await verifySpaceRelease(actor, releaseId));
  });
}
