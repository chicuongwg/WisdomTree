import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  authorizeCommentContext,
  clearPresence,
  listPresence,
  markPresence,
} from "@/modules/notify/service";

// /api/presence?page=<key> — who has this surface open right now.
//
// One file for all three verbs because there is only one resource here, and it
// is identified the same way every time: my row on a page. Splitting it would
// mean three files repeating the same page-key parsing to save nothing.
//
// POST answers with the list it just refreshed. The client needs both on every
// heartbeat ("I am still here" and "who else is"), and doing it in one round
// trip halves the traffic of a request that repeats for as long as the page
// stays open.

function pageKeyOf(request: NextRequest): string {
  const key = request.nextUrl.searchParams.get("page");
  // markPresence validates this too, but GET and DELETE never reach it, and a
  // missing key on a read would quietly answer "nobody is here" — which is the
  // one wrong answer this feature must not give by accident.
  if (!key) throw new ApiError(400, "invalid_page", "Invalid page.");
  return key;
}

/**
 * The retained endpoint was only ever used by Node reader/editor pages. Keep
 * that wire format, but resolve it before presence can reveal another user's
 * live activity to a caller who merely guessed a UUID.
 */
async function authorizePage(actor: Awaited<ReturnType<typeof requirePrincipal>>, pageKey: string) {
  const nodeId = /^node:([0-9a-f-]{36})$/i.exec(pageKey)?.[1];
  if (!nodeId) throw new ApiError(400, "invalid_page", "Invalid page.");
  await authorizeCommentContext(actor, "tree_node", nodeId);
}

/** Heartbeat: mark me present, and answer with everyone else on the page. */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const pageKey = pageKeyOf(request);
    await authorizePage(actor, pageKey);
    await markPresence(actor, pageKey);
    return NextResponse.json(await listPresence(actor, pageKey));
  });
}

/** The same list without writing — the honest read of the surface. */
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const pageKey = pageKeyOf(request);
    await authorizePage(actor, pageKey);
    return NextResponse.json(await listPresence(actor, pageKey));
  });
}

/** Leaving. Idempotent, so always 204 — a double send on unload is not an error. */
export async function DELETE(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const pageKey = pageKeyOf(request);
    await authorizePage(actor, pageKey);
    await clearPresence(actor, pageKey);
    return new NextResponse(null, { status: 204 });
  });
}
