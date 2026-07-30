import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { removeSpaceMember, setSpaceMemberRole } from "@/modules/storage/service";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ spaceId: string; userId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId, userId } = await params;
    const body = (await request.json().catch(() => null)) as {
      memberRole?: string;
    } | null;
    if (!body || !["viewer", "contributor", "manager"].includes(body.memberRole ?? "")) {
      return NextResponse.json({ error: "invalid_member_role" }, { status: 400 });
    }
    await setSpaceMemberRole(
      actor,
      spaceId,
      userId,
      body.memberRole as "viewer" | "contributor" | "manager",
    );
    return new NextResponse(null, { status: 204 });
  });
}
