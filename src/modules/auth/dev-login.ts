import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role } from "./schema";

// Local-only sign-in for testing: pick a seeded member, get their session.
// It is an impersonation door, so the gate is deliberately simpler AND
// stricter than the old dev-auth: outside production it is on (npm run dev /
// demo need no configuration), in production it does not exist — there is no
// env var that re-opens it. Real deployments sign in through Google OIDC.

export function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export type SignInCandidate = { id: string; displayName: string; role: Role };

/**
 * The picker's list of members. Behind the same gate as the sign-in it
 * feeds — with the gate closed this returns nothing, so a page that forgets
 * to check cannot enumerate the team either.
 */
export async function listSignInCandidates(): Promise<SignInCandidate[]> {
  if (!devLoginEnabled()) return [];
  return db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(isNull(users.disabledAt))
    .orderBy(asc(users.role), asc(users.displayName));
}

/** Resolve the picked user, or null. The gate is checked here too. */
export async function findSignInCandidate(userId: string): Promise<SignInCandidate | null> {
  if (!devLoginEnabled()) return null;
  const [user] = await db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));
  return user ?? null;
}
