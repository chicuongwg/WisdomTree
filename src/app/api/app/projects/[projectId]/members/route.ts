import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import {
  addAppProjectMember,
  listAppProjectMemberCandidates,
  listAppProjectMembers,
  toApplicationError,
} from "@/modules/application";

const MEMBER_ROLES = ["viewer", "contributor", "manager"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const [members, candidates] = await Promise.all([
      listAppProjectMembers(actor, projectId),
      listAppProjectMemberCandidates(actor, projectId),
    ]);
    return NextResponse.json({ members, candidates });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { projectId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      typeof body.userId !== "string" ||
      (body.memberRole !== undefined &&
        !MEMBER_ROLES.includes(body.memberRole as (typeof MEMBER_ROLES)[number]))
    ) {
      throw new ApiError(400, "invalid_member", "Invalid Project member.");
    }
    await addAppProjectMember(actor, {
      projectId,
      userId: body.userId,
      ...(body.memberRole ? { memberRole: body.memberRole as (typeof MEMBER_ROLES)[number] } : {}),
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
