import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { setAppUserDisabled, setAppUserRole, toApplicationError } from "@/modules/application";

const ROLES = ["user", "editor", "admin_op"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const actor = await requirePrincipal();
    const { userId } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (
      !body ||
      (body.role === undefined && body.disabled === undefined) ||
      (body.role !== undefined && !ROLES.includes(body.role as (typeof ROLES)[number])) ||
      (body.disabled !== undefined && typeof body.disabled !== "boolean")
    ) {
      throw new ApiError(400, "invalid_user_change", "Invalid user change.");
    }
    if (body.role !== undefined)
      await setAppUserRole(actor, userId, body.role as (typeof ROLES)[number]);
    if (body.disabled !== undefined)
      await setAppUserDisabled(actor, userId, body.disabled as boolean);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const applicationError = toApplicationError(error);
    return NextResponse.json(applicationError, { status: applicationError.status });
  }
}
