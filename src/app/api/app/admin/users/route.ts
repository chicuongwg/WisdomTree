import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { inviteAppUser, listAppUsers, toApplicationError } from "@/modules/application";

const ROLES = ["user", "editor", "admin_op"] as const;

export async function GET() {
  try {
    const actor = await requirePrincipal();
    return NextResponse.json({ users: await listAppUsers(actor) });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.displayName !== "string" ||
      (body.role !== undefined && !ROLES.includes(body.role as (typeof ROLES)[number]))
    ) {
      throw new ApiError(400, "invalid_user", "Valid user details are required.");
    }
    const user = await inviteAppUser(actor, {
      email: body.email,
      displayName: body.displayName,
      ...(body.role ? { role: body.role as (typeof ROLES)[number] } : {}),
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
