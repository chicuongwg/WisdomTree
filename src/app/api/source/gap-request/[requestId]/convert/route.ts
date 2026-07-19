import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { convertGapRequest } from "@/modules/storage/curation";

// POST .../convert — turn a triaged gap request into branch or node work
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { requestId } = await params;
    const body = (await request.json().catch(() => null)) as {
      branchId?: string;
      nodeId?: string;
    } | null;
    return NextResponse.json(
      await convertGapRequest(actor, requestId, {
        branchId: body?.branchId,
        nodeId: body?.nodeId,
      }),
    );
  });
}
