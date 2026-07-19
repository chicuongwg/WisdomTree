import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { archiveNode } from "@/modules/knowledge/service";

// POST /api/tree/nodes/{nodeId}/archive — Admin/Op archives a node (audited)
export async function POST(_request: Request, { params }: { params: Promise<{ nodeId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    return NextResponse.json(await archiveNode(actor, nodeId));
  });
}
