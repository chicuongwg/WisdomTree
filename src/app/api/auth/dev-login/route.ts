import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApi, notFound } from "@/lib/errors";
import { enforceRateLimit, requestAddress } from "@/lib/rate-limit";
import { SESSION_TTL_MS } from "@/lib/sign";
import { devLoginEnabled, findSignInCandidate } from "@/modules/auth/dev-login";
import { issueSessionToken, SESSION_COOKIE } from "@/modules/auth/session";

// POST /api/auth/dev-login — local-only: a plain form post from the login
// picker ({ userId }) becomes that member's session and a redirect home.
// Does not exist in production (devLoginEnabled has no override).
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    if (!devLoginEnabled()) throw notFound();
    enforceRateLimit("dev-login", requestAddress(request), 10, 10 * 60_000);

    const form = await request.formData().catch(() => null);
    const userId = form?.get("userId");
    if (typeof userId !== "string" || !userId) {
      throw new ApiError(400, "invalid_user", "Please pick a member.");
    }
    const user = await findSignInCandidate(userId);
    if (!user) throw notFound();

    // 303: the browser follows a form POST with a GET to "/".
    const response = new NextResponse(null, { status: 303, headers: { Location: "/" } });
    response.cookies.set(SESSION_COOKIE, await issueSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // dev-only route; production never serves it
      maxAge: SESSION_TTL_MS / 1000,
      path: "/",
    });
    return response;
  });
}
