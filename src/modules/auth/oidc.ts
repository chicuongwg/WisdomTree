// Google OIDC — the real sign-in the dev picker has substituted for since the
// demo. google-oidc.ts owns the protocol: authorization-code exchange plus
// Google JWKS, issuer, audience and expiry verification. This module owns only
// WisdomTree's invite-list binding.
//
// Access control is the invite list: a Google identity with no users row gets
// nothing. Invited rows carry google_sub = "invited:<uuid>" (the column is NOT
// NULL UNIQUE); the first successful Google login for that email binds the
// real sub, audited. No just-in-time provisioning beyond that — the team is
// ≤10 people and the admin knows all of them.

import { randomUUID } from "node:crypto";
import { createGoogleOidcClient, type GoogleClaims } from "./google-oidc";
import { and, eq, isNull, like } from "drizzle-orm";
import { db } from "@/db";
import { users } from "./schema";
import { recordAudit } from "../audit/service";

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
  return createGoogleOidcClient(cfg).authorizationUrl(state);
}

/** Exchange the code, check iss/aud/exp, hand back who Google says this is. */
export async function exchangeCode(code: string): Promise<GoogleClaims | null> {
  const cfg = oidcConfig();
  if (!cfg) return null;
  return createGoogleOidcClient(cfg).exchangeCode(code);
}

/**
 * Google identity → users row, or null (not invited → no access). Exact sub
 * match wins; otherwise an invited row with the same email binds this sub,
 * audited as the identity-linking event it is.
 */
export async function findOrBindUser(claims: GoogleClaims): Promise<{ id: string } | null> {
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
      { userId: invited.id, role: "user", spaceIds: [], spaceMemberships: [] },
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
