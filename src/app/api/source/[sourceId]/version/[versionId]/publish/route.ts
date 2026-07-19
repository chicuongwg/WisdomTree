import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { publishFromSource } from "@/modules/storage/curation";

// POST .../publish — Admin/Op publishes the approved draft into the tree
// (idempotent; creates promotion provenance; 201)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; versionId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { sourceId, versionId } = await params;
    const body = (await request.json().catch(() => null)) as {
      branchId?: string;
      nodeId?: string;
      verification?: string;
      excerptChunkIds?: string[];
    } | null;
    if (!body?.branchId || !["unverified", "verified"].includes(body.verification ?? "")) {
      throw new ApiError(400, "invalid_publish", "Vui lòng chọn chuyên đề và mức thẩm định.");
    }
    const node = await publishFromSource(actor, sourceId, versionId, {
      branchId: body.branchId,
      nodeId: body.nodeId,
      verification: body.verification as "unverified" | "verified",
      excerptChunkIds: Array.isArray(body.excerptChunkIds) ? body.excerptChunkIds : undefined,
    });
    return NextResponse.json(node, { status: 201 });
  });
}
