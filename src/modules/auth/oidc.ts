// Google OIDC — the real sign-in the dev picker has substituted for since the
// demo (decision-log.md:92). Server-side authorization-code flow, no new
// dependency:
//
// ponytail: the ID token's signature is NOT verified against Google's JWKS.
// This is the confidential-client shortcut the OIDC spec itself sanctions
// (Core §3.1.3.7 note): the token arrives in the direct TLS response from
// Google's token endpoint, not through the browser, so the channel vouches for
// it. iss, aud and exp are still checked. If a token ever arrives by any other
// path, that path must do full JWKS verification.
//
// Access control is the invite list: a Google identity with no users row gets
// nothing. Invited rows carry google_sub = "invited:<uuid>" (the column is NOT
// NULL UNIQUE); the first successful Google login for that email binds the
// real sub, audited. No just-in-time provisioning beyond that — the team is
// ≤10 people and the admin knows all of them.

import { randomUUID } from "node:crypto";
import { and, eq, isNull, like } from "drizzle-orm";
import { db } from "@/db";
import { users } from "./schema";
import { recordAudit } from "../audit/service";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export function oidcConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL; // e.g. https://tree.example.org
  if (!clientId || !clientSecret || !appUrl) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/auth/oidc/callback`,
  };
}

export const oidcEnabled = () => oidcConfig() !== null;

export function authorizationUrl(state: string): string {
  const cfg = oidcConfig();
  if (!cfg) throw new Error("OIDC not configured");
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${p}`;
}

type Claims = { sub: string; email: string };

/** Exchange the code, check iss/aud/exp, hand back who Google says this is. */
export async function exchangeCode(code: string): Promise<Claims | null> {
  const cfg = oidcConfig();
  if (!cfg) return null;
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) return null;
  const parts = id_token.split(".");
  if (parts.length !== 3) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const iss = claims.iss;
  const aud = claims.aud;
  const exp = claims.exp;
  const sub = claims.sub;
  const email = claims.email;
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") return null;
  if (aud !== cfg.clientId) return null;
  if (typeof exp !== "number" || exp * 1000 < Date.now()) return null;
  if (typeof sub !== "string" || typeof email !== "string") return null;
  return { sub, email };
}

/**
 * Google identity → users row, or null (not invited → no access). Exact sub
 * match wins; otherwise an invited row with the same email binds this sub,
 * audited as the identity-linking event it is.
 */
export async function findOrBindUser(claims: Claims): Promise<{ id: string } | null> {
  const [bySub] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.googleSub, claims.sub), isNull(users.disabledAt)));
  if (bySub) return bySub;

  const [invited] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.email, claims.email),
        like(users.googleSub, "invited:%"),
        isNull(users.disabledAt),
      ),
    );
  if (!invited) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ googleSub: claims.sub, updatedAt: new Date() })
      .where(eq(users.id, invited.id));
    await recordAudit(
      tx,
      // The person is authenticating; there is no principal yet. The actor of
      // the bind is the user themself.
      { userId: invited.id, role: "user", spaceIds: [] },
      {
        accountability: "member",
        action: "user.oidc.bind",
        targetType: "user",
        targetId: invited.id,
        details: { email: claims.email },
      },
    );
  });
  return { id: invited.id };
}

/** Admin invite: the row that a first Google login will claim. */
export function invitedSentinel(): string {
  return `invited:${randomUUID()}`;
}
