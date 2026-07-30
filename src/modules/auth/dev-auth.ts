// Dev-mode substitution boundary (docs/roadmap/demo-brief.md): the demo signs
// in via a user picker over the seeded users (one per role) and issues a
// session; V1 swaps in Google OIDC behind the same session shape. The
// principal matches docs/design/authorization-design.md § Principals:
// resolved once per request, spaceIds cached per request.

import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role } from "./schema";

/**
 * Whether the user-picker sign-in is reachable. It is an impersonation
 * endpoint — it trades a user id for that user's session with no credential —
 * so production has to opt in deliberately, one deployment at a time, until
 * OIDC replaces it. Outside production it is on, so `npm run dev` needs no
 * configuration.
 */
export function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_LOGIN === "1";
}

export interface Principal {
  userId: string;
  role: Role;
  /** Memberships from space_members, resolved once per request. */
  spaceIds: string[];
  spaceMemberships?: Array<{
    spaceId: string;
    role: "viewer" | "contributor" | "manager";
  }>;
  /** Host-owned operational capabilities. */
  capabilities?: string[];
  /** Vaults explicitly granted to this principal. */
  vaultIds?: string[];
  vaultGrants?: Array<{
    vaultId: string;
    grant: "owner" | "editor" | "reviewer" | "viewer";
  }>;
}

export interface AuthProvider {
  /** Resolve the request principal from the session cookie, or null → 401. */
  resolvePrincipal(sessionToken: string | undefined): Promise<Principal | null>;
  /** Dev picker: issue a session for a seeded user. */
  signInAs(userId: string): Promise<{ sessionToken: string }>;
  signOut(sessionToken: string): Promise<void>;
}

export type SignInCandidate = { id: string; displayName: string; role: Role };

/**
 * The picker's list of seeded members. Owned by this module rather than read
 * off `users` by the login page: enumerating accounts is an auth concern, and
 * it must stay behind the same gate as the sign-in it feeds — a caller that
 * forgets `devLoginEnabled()` gets an empty list, not the team roster.
 */
export async function listSignInCandidates(): Promise<SignInCandidate[]> {
  if (!devLoginEnabled()) return [];
  return db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(isNull(users.disabledAt))
    .orderBy(asc(users.role));
}

/**
 * Resolve the picked user, or null. The gate is checked here too, so the route
 * cannot mint a session for someone by skipping it.
 */
export async function findSignInCandidate(userId: string): Promise<SignInCandidate | null> {
  if (!devLoginEnabled()) return null;
  const [user] = await db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));
  return user ?? null;
}
