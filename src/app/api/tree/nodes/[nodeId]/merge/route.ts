import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { mergeNode } from "@/modules/knowledge/service";

// POST /api/tree/nodes/{nodeId}/merge — Admin/Op merges into a canonical node
// (this node archives and redirects; audited)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const body = (await request.json().catch(() => null)) as { canonicalNodeId?: string } | null;
    if (!body?.canonicalNodeId) {
      throw new ApiError(400, "invalid_merge", "A canonical node to merge into is required.");
    }
    return NextResponse.json(await mergeNode(actor, nodeId, body.canonicalNodeId));
  });
}
