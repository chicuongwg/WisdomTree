import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  removeAppProjectMember,
  toApplicationError,
  updateAppProjectMemberRole,
} from "@/modules/application";

const MEMBER_ROLES = ["viewer", "contributor", "manager"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, userId } = await params;
    const body = (await request.json().catch(() => null)) as { memberRole?: unknown } | null;
    if (!body || !MEMBER_ROLES.includes(body.memberRole as (typeof MEMBER_ROLES)[number])) {
      throw new ApiError(400, "invalid_member_role", "Invalid Project member role.");
    }
    await updateAppProjectMemberRole(actor, {
      projectId,
      userId,
      memberRole: body.memberRole as (typeof MEMBER_ROLES)[number],
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId, userId } = await params;
    await removeAppProjectMember(actor, { projectId, userId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
