import { NextResponse } from "next/server";
import { handleApi, notFound } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createGraphProvider } from "@/modules/graph/provider";

// GET /api/tree/nodes/{nodeId}/preview — the hover/focus card payload:
// title, verification and a ~200-character excerpt. Read-only, gated by
// knowledge.node.read like every other node read; unknown (or not-visible)
// node → 404 so the endpoint never confirms a page the reader cannot open.
export async function GET(_request: Request, { params }: { params: Promise<{ nodeId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const preview = await createGraphProvider(actor).loadPreview(nodeId);
    if (!preview) throw notFound();
    return NextResponse.json(preview);
  });
}
