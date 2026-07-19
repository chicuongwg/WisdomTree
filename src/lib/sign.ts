import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC signing for dev-mode session cookies and short-lived download tokens.
// V1 replaces the download half with real S3 pre-signed URLs behind the same
// ObjectStore interface; the session half with OIDC-backed sessions.

const SECRET = process.env.SESSION_SECRET ?? "wisdomtree-dev-secret";

function hmac(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function sign(payload: string): string {
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${hmac(payload)}`;
}

export function verify(token: string): string | null {
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
  return payload;
}

/** Signed URL substitute: token for exactly one object key, valid for minutes. */
export function signDownload(objectKey: string, filename: string, ttlMs = 5 * 60_000): string {
  return sign(JSON.stringify({ k: objectKey, f: filename, exp: Date.now() + ttlMs }));
}

export function verifyDownload(token: string): { objectKey: string; filename: string } | null {
  const payload = verify(token);
  if (!payload) return null;
  try {
    const { k, f, exp } = JSON.parse(payload) as { k: string; f: string; exp: number };
    if (typeof k !== "string" || typeof f !== "string" || Date.now() > exp) return null;
    return { objectKey: k, filename: f };
  } catch {
    return null;
  }
}
