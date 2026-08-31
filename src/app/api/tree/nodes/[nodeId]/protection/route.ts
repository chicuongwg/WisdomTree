import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { setNodeProtection } from "@/modules/knowledge/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const body = (await request.json()) as { reviewRequired?: boolean };
    return NextResponse.json(await setNodeProtection(actor, nodeId, body.reviewRequired === true));
  });
}
