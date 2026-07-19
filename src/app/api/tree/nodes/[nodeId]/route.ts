import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getNode, updateNode, type Verification } from "@/modules/knowledge/service";

// GET /api/tree/nodes/{nodeId} — node with links, tags, provenance, verification
export async function GET(_request: Request, { params }: { params: Promise<{ nodeId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    return NextResponse.json(await getNode(actor, nodeId));
  });
}

// PATCH /api/tree/nodes/{nodeId} — optimistic-locked edit; `verification`
// exposes the Admin/Op transitions incl. the audited verified→unverified
// downgrade (state-machines.md)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      contentMd?: string;
      tags?: string[];
      links?: Array<{ toNodeId: string; linkType: string }>;
      verification?: Verification;
      publish?: boolean;
      expectedVersion?: number;
    };
    const node = await updateNode(actor, nodeId, {
      title: body.title,
      contentMd: body.contentMd,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      links: Array.isArray(body.links) ? body.links : undefined,
      verification: body.verification,
      publish: body.publish,
      expectedVersion: typeof body.expectedVersion === "number" ? body.expectedVersion : undefined,
    });
    return NextResponse.json(node);
  });
}
