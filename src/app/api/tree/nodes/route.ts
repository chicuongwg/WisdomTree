import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createNode } from "@/modules/knowledge/service";

// POST /api/tree/nodes — Editor creates a manual node (enters no_source; 201)
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      branchId?: string;
      title?: string;
      contentMd?: string;
      tags?: string[];
      links?: Array<{ toNodeId: string; linkType: string }>;
    } | null;
    if (!body?.branchId || !body.title?.trim() || typeof body.contentMd !== "string") {
      throw new ApiError(400, "invalid_node", "Branch, title and content are required.");
    }
    const node = await createNode(actor, {
      branchId: body.branchId,
      title: body.title.trim(),
      contentMd: body.contentMd,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      links: Array.isArray(body.links) ? body.links : undefined,
    });
    return NextResponse.json(node, { status: 201 });
  });
}
