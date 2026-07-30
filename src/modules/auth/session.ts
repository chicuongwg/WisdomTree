import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { eq, isNull, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, userCapabilities, users } from "./schema";
import { spaceMembers } from "../storage/schema";
import { vaultGrants } from "../knowledge/schema";
import { SESSION_TTL_MS } from "@/lib/sign";
import type { Principal } from "./dev-auth";

export const SESSION_COOKIE = "session";

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function resolveToken(token: string): Promise<(Principal & { user: typeof users.$inferSelect }) | null> {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        isNull(users.disabledAt),
      ),
    );
  if (!row) return null;

  const [memberships, capabilities, grants] = await Promise.all([
    db
      .select({ spaceId: spaceMembers.spaceId, role: spaceMembers.memberRole })
      .from(spaceMembers)
      .where(eq(spaceMembers.userId, row.user.id)),
    db
      .select({ capability: userCapabilities.capability })
      .from(userCapabilities)
      .where(eq(userCapabilities.userId, row.user.id)),
    db
      .select({ vaultId: vaultGrants.vaultId, grant: vaultGrants.grant })
      .from(vaultGrants)
      .where(eq(vaultGrants.userId, row.user.id)),
  ]);
  void db
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, row.session.id));
  return {
    userId: row.user.id,
    role: row.user.role,
    spaceIds: memberships.map((membership) => membership.spaceId),
    spaceMemberships: memberships,
    capabilities: capabilities.map((capability) => capability.capability),
    vaultIds: grants.map((grant) => grant.vaultId),
    vaultGrants: grants,
    user: row.user,
  };
}

export async function resolvePrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveToken(token);
}

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const principal = await resolveToken(token);
  if (!principal) return null;
  return {
    ...principal.user,
    spaceIds: principal.spaceIds,
    spaceMemberships: principal.spaceMemberships ?? [],
    capabilities: principal.capabilities ?? [],
    vaultIds: principal.vaultIds ?? [],
    vaultGrants: principal.vaultGrants ?? [],
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
