import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { requirePrincipal } from "@/lib/request";
import { getProfile, updateProfile } from "@/modules/auth/profile";

// GET /api/account — the caller's own record (never anyone else's: the id
// comes from the session, not the URL).
export async function GET() {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    return NextResponse.json(await getProfile(actor));
  });
}

// PATCH /api/account — { displayName?, zaloUserId? }. Role, email and
// google_sub are not accepted here by design (see modules/auth/profile.ts).
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      displayName?: unknown;
      zaloUserId?: unknown;
    } | null;
    if (
      !body ||
      (body.displayName !== undefined && typeof body.displayName !== "string") ||
      (body.zaloUserId !== undefined && body.zaloUserId !== null && typeof body.zaloUserId !== "string")
    ) {
      // TODO(vi): move to src/lib/vi.ts
      throw new ApiError(400, "invalid_profile", "Thông tin hồ sơ không hợp lệ.");
    }
    await updateProfile(actor, {
      displayName: body.displayName as string | undefined,
      zaloUserId: body.zaloUserId as string | null | undefined,
    });
    return new Response(null, { status: 204 });
  });
}
