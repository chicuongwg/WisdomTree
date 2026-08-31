import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { proposeNodeChange } from "@/modules/knowledge/service";

// POST /api/tree/nodes/{nodeId}/proposals — propose a change to a promoted
// node (the locked half of the two-tier model) → 201 {proposalId, state}.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      summary?: string;
      sortOrder?: number;
      contentMd?: string;
      tags?: string[];
      links?: Array<{ toNodeId: string; linkType: string }>;
      expectedVersion?: number;
    };
    const proposal = await proposeNodeChange(actor, nodeId, {
      title: body.title,
      summary: body.summary,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      contentMd: body.contentMd,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      links: Array.isArray(body.links) ? body.links : undefined,
      expectedVersion: typeof body.expectedVersion === "number" ? body.expectedVersion : undefined,
    });
    return NextResponse.json(proposal, { status: 201 });
  });
}
