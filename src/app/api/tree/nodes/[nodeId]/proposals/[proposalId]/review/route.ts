import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { reviewNodeProposal } from "@/modules/knowledge/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string; proposalId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId, proposalId } = await params;
    const body = (await request.json().catch(() => null)) as {
      decision?: string;
      verification?: string;
    } | null;
    if (!body || !["approved", "rejected", "changes_requested"].includes(body.decision ?? "")) {
      throw new ApiError(400, "invalid_review", "Invalid review decision.");
    }
    return NextResponse.json(
      await reviewNodeProposal(actor, nodeId, proposalId, {
        decision: body.decision as "approved" | "rejected" | "changes_requested",
        verification:
          body.verification === "verified" || body.verification === "unverified"
            ? body.verification
            : undefined,
      }),
    );
  });
}
