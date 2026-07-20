import { NextResponse } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { addSpaceMember, listSpaceMembers } from "@/modules/storage/service";

// GET /api/spaces/{spaceId}/members — members with names (Admin/Op)
export async function GET(_request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId } = await params;
    return NextResponse.json(await listSpaceMembers(actor, spaceId));
  });
}

// POST /api/spaces/{spaceId}/members — add a member (Admin/Op); re-add is a no-op
export async function POST(request: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { spaceId } = await params;
    const body = (await request.json().catch(() => ({}))) as { userId?: string };
    await addSpaceMember(actor, spaceId, body.userId ?? "");
    return new NextResponse(null, { status: 201 });
  });
}
