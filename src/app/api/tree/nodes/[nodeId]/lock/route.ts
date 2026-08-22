import { NextResponse } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { currentSessionKey } from "@/modules/auth/session";
import { acquireEditLock, releaseEditLock } from "@/modules/knowledge/service";

// POST /api/tree/nodes/{nodeId}/lock — take (or keep) the single-writer edit
// lock. Re-POSTing IS the heartbeat; 423-style refusal is a 409 naming the
// current holder so the editor can say who has it.
export async function POST(_request: Request, { params }: { params: Promise<{ nodeId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const sessionKey = await currentSessionKey();
    if (!sessionKey) throw new ApiError(401, "unauthorized", "Invalid session.");
    const state = await acquireEditLock(actor, nodeId, sessionKey);
    if (state.locked && !state.ownedByMe) {
      throw new ApiError(
        409,
        "edit_locked",
        `Locked: currently being edited by ${state.holderName}.`,
        { holderName: state.holderName },
      );
    }
    return NextResponse.json({ locked: true });
  });
}

// DELETE — leave the editor; only the holding session frees the lock.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { nodeId } = await params;
    const sessionKey = await currentSessionKey();
    if (sessionKey) await releaseEditLock(actor, nodeId, sessionKey);
    return new NextResponse(null, { status: 204 });
  });
}
