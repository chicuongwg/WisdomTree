import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi } from "@/lib/errors";
import { devLoginEnabled, findSignInCandidate } from "@/modules/auth/dev-auth";
import { issueSessionToken, SESSION_COOKIE } from "@/modules/auth/session";
import { SESSION_TTL_MS } from "@/lib/sign";

// POST /api/auth/dev-login — DEV-ONLY route, not part of openapi.yaml.
// This is the demo's auth substitution (demo-brief.md): a user picker over
// seeded users issuing a session; V1 replaces it with Google OIDC.
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    // Impersonation with no credential: 404 rather than 403, so a deployment
    // that has not opted in does not advertise that the endpoint exists.
    if (!devLoginEnabled()) throw new ApiError(404, "not_found", "Không tìm thấy nội dung này.");

    const { userId } = (await request.json()) as { userId?: string };
    if (!userId) throw new ApiError(400, "missing_user", "Vui lòng chọn người dùng.");
    const user = await findSignInCandidate(userId);
    if (!user) throw new ApiError(400, "unknown_user", "Người dùng không tồn tại.");

    const response = NextResponse.json({ userId: user.id, displayName: user.displayName, role: user.role });
    response.cookies.set(SESSION_COOKIE, issueSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      // Plain HTTP is a local-dev affordance; anywhere real this cookie is a
      // bearer credential and must not travel in the clear.
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS / 1000,
      path: "/",
    });
    return response;
  });
}
