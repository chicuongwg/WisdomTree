import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createComment, listComments, type AnchorType } from "@/modules/notify/service";

// `loan_ticket` is deliberately absent: a loan ticket is a factual record on
// the Catalog Item Detail screen, not a discussion (owner decision
// 2026-07-20). It therefore fails this list like any unknown anchor type and
// answers 400 invalid_anchor — the house rule for a malformed request, versus
// the 404 reserved for an anchor the caller may not see.
const ANCHOR_TYPES: AnchorType[] = ["source", "tree_node", "deadline"];

// GET /api/comments?anchorType=&anchorId= — comments on an object the caller
// can see; a non-visible anchor answers 404 (anchor-scope delegation).
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const anchorType = request.nextUrl.searchParams.get("anchorType") as AnchorType | null;
    const anchorId = request.nextUrl.searchParams.get("anchorId");
    if (!anchorType || !ANCHOR_TYPES.includes(anchorType) || !anchorId) {
      throw new ApiError(400, "invalid_anchor", "An anchor type and id are required.");
    }
    return NextResponse.json(await listComments(actor, anchorType, anchorId));
  });
}

// POST /api/comments — comment on a visible object. Mentions are NOT sent by
// the client: the server parses @Tên out of the body against the members who
// can see the anchor, so the request shape is body-only.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      anchorType?: AnchorType;
      anchorId?: string;
      parentCommentId?: string;
      body?: string;
    } | null;
    // The anchor and the text fail separately: "you cannot discuss that kind
    // of thing" and "you typed nothing" are different mistakes, and the reader
    // deserves the one that actually applies.
    if (!body?.anchorType || !ANCHOR_TYPES.includes(body.anchorType) || !body.anchorId) {
      throw new ApiError(400, "invalid_anchor", "This item does not accept comments.");
    }
    if (!body.body?.trim()) {
      throw new ApiError(400, "invalid_comment", "Comment body must not be empty.");
    }
    const comment = await createComment(actor, {
      anchorType: body.anchorType,
      anchorId: body.anchorId,
      parentCommentId: body.parentCommentId,
      body: body.body.trim(),
    });
    return NextResponse.json(comment, { status: 201 });
  });
}
