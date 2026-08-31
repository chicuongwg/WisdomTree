import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { reviewTranslationProposal } from "@/modules/knowledge/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { proposalId } = await params;
    const body = (await request.json().catch(() => null)) as { decision?: string; note?: string } | null;
    if (!body || !["approved", "rejected", "changes_requested"].includes(body.decision ?? "")) throw new ApiError(400, "invalid_decision", "A valid decision is required.");
    return NextResponse.json(
      await reviewTranslationProposal(actor, proposalId, {
        decision: body.decision as "approved" | "rejected" | "changes_requested",
        note: body.note,
      }),
    );
  });
}
