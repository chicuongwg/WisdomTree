import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { decideNodePublication } from "@/modules/knowledge/service";

// POST /api/tree/publication-proposals/{proposalId}/decision — the promotion
// review boundary: an independent reviewer approves or rejects the proposal.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { proposalId } = await params;
    const body = (await request.json().catch(() => null)) as {
      decision?: string;
      verification?: string;
      note?: string;
    } | null;
    if (!body || !["approved", "rejected", "changes_requested"].includes(body.decision ?? "")) {
      throw new ApiError(400, "invalid_review", "Invalid review decision.");
    }
    return NextResponse.json(
      await decideNodePublication(actor, proposalId, {
        decision: body.decision as "approved" | "rejected" | "changes_requested",
        verification:
          body.verification === "verified" || body.verification === "unverified"
            ? body.verification
            : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
      }),
    );
  });
}
