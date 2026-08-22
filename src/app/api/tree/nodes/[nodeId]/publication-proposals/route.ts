import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { submitNodePublication } from "@/modules/knowledge/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const body = (await request.json().catch(() => null)) as { targetBranchId?: string } | null;
    if (!body?.targetBranchId) {
      throw new ApiError(400, "invalid_target_branch", "A target team branch is required.");
    }
    return NextResponse.json(await submitNodePublication(actor, nodeId, body.targetBranchId), {
      status: 201,
    });
  });
}
