import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC signing for dev-mode session cookies and short-lived download tokens.
// V1 replaces the download half with real S3 pre-signed URLs behind the same
// ObjectStore interface; the session half with OIDC-backed sessions.
//
// Every token carries a purpose tag and an expiry inside the signed payload.
// The purpose tag is what stops a session cookie being replayed as a download
// grant, or the reverse: both halves share one key, so without it the only
// thing keeping them apart is that their payload shapes happen not to parse as
// each other today.

let cachedSecret: string | null = null;

/**
 * Resolved on first use rather than at import, because `next build` runs under
 * NODE_ENV=production and imports this module to collect page data: checking
 * at import would make the production secret a *build*-time requirement, and
 * the whole point of a secret is that it is injected when the container runs,
 * not baked into the image.
 */
function secret(): string {
  if (cachedSecret !== null) return cachedSecret;
  const configured = process.env.SESSION_SECRET;
  if (configured) return (cachedSecret = configured);
  if (process.env.NODE_ENV === "production") {
    // Loud on the first request that needs it, rather than silently signing
    // with a value published in this repo — which would let anyone mint an
    // admin_op session or a download token for any stored file.
    throw new Error(
      "SESSION_SECRET is required in production. Without it, session cookies and " +
        "download tokens are forgeable from the default in src/lib/sign.ts.",
    );
  }
  return (cachedSecret = "wisdomtree-dev-secret");
}

type Purpose = "session" | "download" | "oauth-state";

/** How long a signed-in session stays valid without re-authenticating. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DOWNLOAD_TTL_MS = 5 * 60_000;

function hmac(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

// Payload layout: `<purpose>.<expiry-ms>.<value>`. The value is the remainder
// after the second separator, so it may contain dots of its own.
function sign(purpose: Purpose, value: string, ttlMs: number): string {
  const payload = `${purpose}.${Date.now() + ttlMs}.${value}`;
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${hmac(payload)}`;
}

function verify(purpose: Purpose, token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  let payload: string;
  try {
    payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = Buffer.from(hmac(payload));
  const actual = Buffer.from(token.slice(dot + 1));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const firstSep = payload.indexOf(".");
  const secondSep = payload.indexOf(".", firstSep + 1);
  if (firstSep < 0 || secondSep < 0) return null;
  if (payload.slice(0, firstSep) !== purpose) return null;
  const expiresAt = Number(payload.slice(firstSep + 1, secondSep));
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return payload.slice(secondSep + 1);
}

/** Signed URL substitute: token for exactly one object key, valid for minutes. */
export function signDownload(objectKey: string, filename: string, ttlMs = DOWNLOAD_TTL_MS): string {
  return sign("download", JSON.stringify({ k: objectKey, f: filename }), ttlMs);
}

export function verifyDownload(token: string): { objectKey: string; filename: string } | null {
  const value = verify("download", token);
  if (!value) return null;
  try {
    const { k, f } = JSON.parse(value) as { k: unknown; f: unknown };
    if (typeof k !== "string" || typeof f !== "string") return null;
    return { objectKey: k, filename: f };
  } catch {
    return null;
  }
}

/**
 * OAuth state: CSRF proof for the OIDC round trip. Ten minutes is the window
 * between "clicked Đăng nhập bằng Google" and "came back" — generous for a
 * person, useless to an attacker replaying it later.
 */
export function signOAuthState(nonce: string): string {
  return sign("oauth-state", nonce, 10 * 60_000);
}

export function verifyOAuthState(token: string): string | null {
  return verify("oauth-state", token);
}
