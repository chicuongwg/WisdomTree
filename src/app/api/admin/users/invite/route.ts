import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { inviteUser } from "@/modules/auth/admin";

const ROLES = ["user", "editor", "admin_op"] as const;
type Role = (typeof ROLES)[number];

// POST /api/admin/users/invite — { email, displayName, role? } → 201 with the
// new row's id. Validation (email shape, name, duplicate) lives in inviteUser;
// this route only narrows role to the known set and lets the module object.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      displayName?: unknown;
      role?: unknown;
    } | null;
    const created = await inviteUser(actor, {
      email: typeof body?.email === "string" ? body.email : undefined,
      displayName: typeof body?.displayName === "string" ? body.displayName : undefined,
      role: ROLES.includes(body?.role as Role) ? (body?.role as Role) : undefined,
    });
    return NextResponse.json(created, { status: 201 });
  });
}
