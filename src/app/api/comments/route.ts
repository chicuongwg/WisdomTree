import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { createComment, listComments, type AnchorType } from "@/modules/notify/service";

const ANCHOR_TYPES: AnchorType[] = ["source", "tree_node", "loan_ticket", "deadline"];

// GET /api/comments?anchorType=&anchorId= — comments on an object the caller
// can see; a non-visible anchor answers 404 (anchor-scope delegation).
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const anchorType = request.nextUrl.searchParams.get("anchorType") as AnchorType | null;
    const anchorId = request.nextUrl.searchParams.get("anchorId");
    if (!anchorType || !ANCHOR_TYPES.includes(anchorType) || !anchorId) {
      throw new ApiError(400, "invalid_anchor", "Vui lòng cung cấp loại và mã của mục cần xem thảo luận.");
    }
    return NextResponse.json(await listComments(actor, anchorType, anchorId));
  });
}

// POST /api/comments — comment on a visible object; mentions notify members.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      anchorType?: AnchorType;
      anchorId?: string;
      parentCommentId?: string;
      body?: string;
      mentions?: string[];
    } | null;
    if (
      !body?.anchorType ||
      !ANCHOR_TYPES.includes(body.anchorType) ||
      !body.anchorId ||
      !body.body?.trim()
    ) {
      throw new ApiError(400, "invalid_comment", "Vui lòng nhập nội dung thảo luận.");
    }
    const comment = await createComment(actor, {
      anchorType: body.anchorType,
      anchorId: body.anchorId,
      parentCommentId: body.parentCommentId,
      body: body.body.trim(),
      mentions: Array.isArray(body.mentions) ? body.mentions : undefined,
    });
    return NextResponse.json(comment, { status: 201 });
  });
}
