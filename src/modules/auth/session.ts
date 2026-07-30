import { cookies } from "next/headers";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { userCapabilities, users } from "./schema";
import { spaceMembers } from "../storage/schema";
import { vaultGrants } from "../knowledge/schema";
import { signSession, verifySession } from "@/lib/sign";
import type { Principal } from "./dev-auth";

// Dev-auth implementation (demo substitution): the session cookie carries a
// signed userId issued by the user picker; V1 swaps OIDC in behind the same
// Principal shape. Resolved once per request, spaceIds cached on the
// principal (authorization-design.md § Principals and Claims).

export const SESSION_COOKIE = "session";

export async function resolvePrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifySession(token);
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));
  if (!user) return null;

  const [memberships, capabilities, grants] = await Promise.all([
    db
      .select({ spaceId: spaceMembers.spaceId })
      .from(spaceMembers)
      .where(eq(spaceMembers.userId, user.id)),
    db
      .select({ capability: userCapabilities.capability })
      .from(userCapabilities)
      .where(eq(userCapabilities.userId, user.id)),
    db
      .select({ vaultId: vaultGrants.vaultId })
      .from(vaultGrants)
      .where(eq(vaultGrants.userId, user.id)),
  ]);

  return {
    userId: user.id,
    role: user.role,
    spaceIds: memberships.map((m) => m.spaceId),
    capabilities: capabilities.map((c) => c.capability),
    vaultIds: grants.map((g) => g.vaultId),
  };
}

export async function currentUser() {
  const principal = await resolvePrincipal();
  if (!principal) return null;
  const [user] = await db.select().from(users).where(eq(users.id, principal.userId));
  return user
    ? {
        ...user,
        spaceIds: principal.spaceIds,
        capabilities: principal.capabilities ?? [],
        vaultIds: principal.vaultIds ?? [],
      }
    : null;
}

export function issueSessionToken(userId: string): string {
  return signSession(userId);
}
