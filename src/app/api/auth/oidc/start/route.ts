import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { handleApi, notFound } from "@/lib/errors";
import { enforceRateLimit, requestAddress } from "@/lib/rate-limit";
import { signOAuthState } from "@/lib/sign";
import { authorizationUrl, oidcEnabled } from "@/modules/auth/oidc";

// GET /api/auth/oidc/start — off to Google. The state nonce travels twice:
// signed inside the state param AND raw in a short-lived cookie; the callback
// requires both and requires them to agree, which is the CSRF check. The PKCE
// verifier rides the same kind of cookie; only its S256 challenge goes to
// Google, so the code is useless to anyone who intercepts it.
const OIDC_COOKIE = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 600,
  path: "/api/auth/oidc",
} as const;

export async function GET(request: NextRequest) {
  return handleApi(async () => {
    if (!oidcEnabled()) throw notFound();
    enforceRateLimit("auth.oidc-start", requestAddress(request), 20, 10 * 60_000);
    const nonce = randomUUID();
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const response = NextResponse.redirect(authorizationUrl(signOAuthState(nonce), challenge));
    response.cookies.set("oidc_nonce", nonce, OIDC_COOKIE);
    response.cookies.set("oidc_pkce", verifier, OIDC_COOKIE);
    return response;
  });
}
