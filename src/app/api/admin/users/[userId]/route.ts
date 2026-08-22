import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { setUserDisabled, setUserRole } from "@/modules/auth/admin";

const ROLES = ["user", "editor", "admin_op"] as const;
type Role = (typeof ROLES)[number];

// PATCH /api/admin/users/{userId} — { role?, disabled? }. Either or both;
// role first, so a demote-and-disable stops at the first guard that objects
// (last_admin, self_disable) with nothing half-applied after it.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const { userId } = await params;
    const body = (await request.json().catch(() => null)) as {
      role?: unknown;
      disabled?: unknown;
    } | null;
    const hasRole = body?.role !== undefined;
    const hasDisabled = body?.disabled !== undefined;
    if (
      !body ||
      (!hasRole && !hasDisabled) ||
      (hasRole && !ROLES.includes(body.role as Role)) ||
      (hasDisabled && typeof body.disabled !== "boolean")
    ) {
      throw new ApiError(400, "invalid_user_change", "Invalid user change payload.");
    }
    if (hasRole) await setUserRole(actor, userId, body.role as Role);
    if (hasDisabled) await setUserDisabled(actor, userId, body.disabled as boolean);
    return new NextResponse(null, { status: 204 });
  });
}
