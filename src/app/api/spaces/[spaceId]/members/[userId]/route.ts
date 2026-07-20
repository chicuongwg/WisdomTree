import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { removeSpaceMember } from "@/modules/storage/service";

// DELETE /api/spaces/{spaceId}/members/{userId} — remove a member (Admin/Op)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ spaceId: string; userId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId, userId } = await params;
    await removeSpaceMember(actor, spaceId, userId);
    return new NextResponse(null, { status: 204 });
  });
}
