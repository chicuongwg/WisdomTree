import { NextResponse, type NextRequest } from "next/server";
import { handleApi, notFound } from "@/lib/errors";
import { verifyOAuthState } from "@/lib/sign";
import { exchangeCode, findOrBindUser, oidcEnabled } from "@/modules/auth/oidc";
import { issueSessionToken, SESSION_COOKIE } from "@/modules/auth/session";
import { SESSION_TTL_MS } from "@/lib/sign";

// GET /api/auth/oidc/callback — back from Google. Every failure lands on
// /login with a coarse error code; the page says it in Vietnamese. Codes are
// deliberately coarse — "state_mismatch" teaches an attacker nothing.
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    if (!oidcEnabled()) throw notFound();
    // Relative Locations throughout: behind the reverse proxy that any real
    // deployment of this flow sits behind, request.url is the internal host —
    // an absolute redirect would land the reader (and the session cookie) on
    // localhost instead of the public origin.
    const back = (error: string) =>
      new Response(null, { status: 302, headers: { Location: `/login?error=${error}` } });

    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    const cookieNonce = request.cookies.get("oidc_nonce")?.value;
    if (!state || !code || !cookieNonce) return back("oidc_failed");
    if (verifyOAuthState(state) !== cookieNonce) return back("oidc_failed");

    const claims = await exchangeCode(code);
    if (!claims) return back("oidc_failed");

    const user = await findOrBindUser(claims);
    // Valid Google account, no invitation: the one case worth its own words.
    if (!user) return back("not_invited");

    const response = new NextResponse(null, { status: 302, headers: { Location: "/" } });
    response.cookies.delete("oidc_nonce");
    response.cookies.set(SESSION_COOKIE, await issueSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS / 1000,
      path: "/",
    });
    return response;
  });
}
