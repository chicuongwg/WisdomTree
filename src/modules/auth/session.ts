import { cookies } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { eq, isNull, and, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "./schema";
import { spaceMembers } from "../storage/schema";
import { SESSION_TTL_MS } from "@/lib/sign";
import type { Principal } from "./principal";

export const SESSION_COOKIE = "session";

/**
 * Inactivity timeout: a session whose last request is older than this reads
 * as signed out, whatever its absolute expiry says. The throttled
 * last_seen_at write below is the sliding renewal; SESSION_TTL_MS stays the
 * absolute cap a session can never slide past.
 */
export const SESSION_IDLE_MS = Number(process.env.SESSION_IDLE_MS ?? 30 * 60_000);

/**
 * The sliding renewal is throttled: last_seen_at is only rewritten once it is
 * this stale, so a busy session costs ~1 write a minute instead of one per
 * request. Idle detection keeps minute granularity against a 30-minute window.
 */
const LAST_SEEN_WRITE_INTERVAL_MS = 60_000;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Per-request memoized: the layout and the page both resolve the same cookie,
 * and React's cache() collapses that to one session+membership read per
 * request. Outside a React request scope (tests, scripts) cache() is a
 * passthrough and every call hits the database, which is what tests rely on.
 */
export const resolveSessionToken = cache(async (token: string): Promise<(Principal & { user: typeof users.$inferSelect }) | null> => {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        gt(sessions.lastSeenAt, new Date(Date.now() - SESSION_IDLE_MS)),
        isNull(users.disabledAt),
      ),
    );
  if (!row) return null;

  const memberships = await db
    .select({ spaceId: spaceMembers.spaceId, role: spaceMembers.memberRole })
    .from(spaceMembers)
    .where(eq(spaceMembers.userId, row.user.id));
  // Fire-and-forget on purpose, but never unhandled: a rejected promise here
  // (a dropped DB connection) would crash the process, not just skip a renewal.
  if (row.session.lastSeenAt.getTime() < Date.now() - LAST_SEEN_WRITE_INTERVAL_MS) {
    db.update(sessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(sessions.id, row.session.id))
      .catch((err) => console.error("[auth] last_seen_at renewal failed:", err));
  }
  return {
    userId: row.user.id,
    role: row.user.role,
    spaceIds: memberships.map((membership) => membership.spaceId),
    spaceMemberships: memberships,
    user: row.user,
  };
});

export async function resolvePrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveSessionToken(token);
}

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const principal = await resolveSessionToken(token);
  if (!principal) return null;
  return {
    ...principal.user,
    spaceIds: principal.spaceIds,
    spaceMemberships: principal.spaceMemberships ?? [],
  };
}

export async function issueSessionToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    userId,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function revokeSessionToken(token: string | undefined): Promise<void> {
  if (!token) return;
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt)));
}

export async function revokeUserSessions(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string) {
  await tx
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

/**
 * Delete session rows long past any use (expired 30+ days ago — which also
 * catches revoked and idle-dead ones, since every row carries expires_at).
 * Run from the cron tick; without it the table only ever grows.
 */
export async function purgeStaleSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date(Date.now() - 30 * 86_400_000)));
}

/**
 * The caller's login-session identity for concerns keyed per SESSION rather
 * than per user (the node edit lock): the same token hash the sessions table
 * stores, so it names exactly one signed-in browser.
 */
export async function currentSessionKey(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? tokenHash(token) : null;
}
