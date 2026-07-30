import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { handleApi, notFound } from "@/lib/errors";
import { enforceRateLimit, requestAddress } from "@/lib/rate-limit";
import { signOAuthState } from "@/lib/sign";
import { authorizationUrl, oidcEnabled } from "@/modules/auth/oidc";

// GET /api/auth/oidc/start — off to Google. The state nonce travels twice:
// signed inside the state param AND raw in a short-lived cookie; the callback
// requires both and requires them to agree, which is the CSRF check.
export async function GET(request: NextRequest) {
  return handleApi(async () => {
    if (!oidcEnabled()) throw notFound();
    enforceRateLimit("auth.oidc-start", requestAddress(request), 20, 10 * 60_000);
    const nonce = randomUUID();
    const response = NextResponse.redirect(authorizationUrl(signOAuthState(nonce)));
    response.cookies.set("oidc_nonce", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/api/auth/oidc",
    });
    return response;
  });
}
