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

// PATCH /api/account — { displayName? }. Role, email and google_sub are not
// accepted here by design (see modules/auth/profile.ts).
export async function PATCH(request: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePrincipal();
    const body = (await request.json().catch(() => null)) as {
      displayName?: unknown;
    } | null;
    if (!body || (body.displayName !== undefined && typeof body.displayName !== "string")) {
      throw new ApiError(400, "invalid_profile", "Invalid profile payload.");
    }
    await updateProfile(actor, {
      displayName: body.displayName as string | undefined,
    });
    return new Response(null, { status: 204 });
  });
}
