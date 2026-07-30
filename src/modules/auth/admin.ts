// Admin-side user management — the other half of the users table's write
// story (profile.ts is the member's own half). Everything here is admin_op
// under admin.users.manage, and every change lands in the audit trail;
// authorization-design.md:151 requires role changes to record old and new
// values, which is done here rather than trusted to callers.
//
// What this file must never do: touch google_sub (the identity provider's),
// or let an admin disable or demote THEMSELVES into a lockout — the last
// admin problem. Both are guarded below.

import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "./dev-auth";
import { authorize } from "./authorize";
import { userCapabilities, users, type Role } from "./schema";
import { revokeUserSessions } from "./session";
import { recordAudit } from "../audit/service";
import { auditEvents } from "../audit/schema";
import { invitedSentinel } from "./oidc";
import { vaultGrants, vaults } from "../knowledge/schema";

export const MANAGED_CAPABILITIES = [
  "capabilities.manage",
  "users.manage",
  "audit.read",
  "catalog.manage",
  "circulation.manage",
  "spaces.manage",
  "content.review",
  "system.operate",
] as const;

/**
 * Invite: create the row a first Google sign-in will claim (oidc.ts binds the
 * real sub to it by email). Until they sign in, the member exists, can be
 * added to spaces, and can be mentioned — the sentinel sub just cannot log in.
 */
export async function inviteUser(
  actor: Principal,
  input: { email?: string; displayName?: string; role?: Role },
) {
  authorize(actor, "admin.users.manage", { kind: "write" });
  const email = input.email?.trim().toLowerCase();
  const displayName = input.displayName?.trim();
  const role: Role = input.role ?? "user";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "invalid_email", "Vui lòng nhập địa chỉ email hợp lệ.");
  }
  if (!displayName) {
    throw new ApiError(400, "invalid_name", "Vui lòng nhập tên hiển thị.");
  }
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new ApiError(409, "email_taken", "Email này đã có tài khoản.");
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ googleSub: invitedSentinel(), email, displayName, role })
      .returning({ id: users.id });
    const [vault] = await tx
      .insert(vaults)
      .values({
        kind: "personal",
        ownerUserId: created.id,
        name: displayName,
        gitRepoKey: `personal/${created.id}`,
      })
      .returning({ id: vaults.id });
    await tx
      .insert(vaultGrants)
      .values({ vaultId: vault.id, userId: created.id, grant: "owner", grantedBy: actor.userId });
    const sharedVaults = await tx
      .select({ id: vaults.id })
      .from(vaults)
      .where(eq(vaults.kind, "shared"));
    if (sharedVaults.length) {
      await tx.insert(vaultGrants).values(
        sharedVaults.map((shared) => ({
          vaultId: shared.id,
          userId: created.id,
          grant: role === "editor" ? ("editor" as const) : ("viewer" as const),
          grantedBy: actor.userId,
        })),
      );
    }
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "user.invite",
      targetType: "user",
      targetId: created.id,
      details: { email, role },
    });
    return created;
  });
}

export async function listUsers(actor: Principal) {
  authorize(actor, "admin.users.manage", { kind: "read" });
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      // Invited but never signed in: the sentinel sub oidc.ts plants is still
      // there — the first Google login replaces it with the real sub.
      invited: sql<boolean>`${users.googleSub} like 'invited:%'`,
    })
    .from(users)
    .orderBy(users.displayName);
  const capabilities = await db.select().from(userCapabilities);
  return rows.map((user) => ({
    ...user,
    capabilities: capabilities
      .filter((capability) => capability.userId === user.id)
      .map((capability) => capability.capability)
      .sort(),
  }));
}

export async function setUserCapabilities(
  actor: Principal,
  userId: string,
  requested: string[],
): Promise<void> {
  authorize(actor, "admin.capabilities.manage", { kind: "write" });
  const capabilities = [...new Set(requested)].sort();
  if (capabilities.some((capability) => !MANAGED_CAPABILITIES.includes(capability as never))) {
    throw new ApiError(400, "invalid_capability", "Capability không hợp lệ.");
  }
  if (
    userId === actor.userId &&
    actor.capabilities.includes("capabilities.manage") &&
    !capabilities.includes("capabilities.manage")
  ) {
    throw new ApiError(409, "self_lockout", "Không thể tự thu hồi quyền quản lý capability.");
  }
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!target) throw notFound();
  await db.transaction(async (tx) => {
    const before = await tx
      .select({ capability: userCapabilities.capability })
      .from(userCapabilities)
      .where(eq(userCapabilities.userId, userId));
    await tx.delete(userCapabilities).where(eq(userCapabilities.userId, userId));
    if (capabilities.length) {
      await tx.insert(userCapabilities).values(
        capabilities.map((capability) => ({
          userId,
          capability,
          grantedBy: actor.userId,
        })),
      );
    }
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "user.capabilities.change",
      targetType: "user",
      targetId: userId,
      details: { from: before.map((item) => item.capability).sort(), to: capabilities },
    });
  });
}

export async function listVaultGrants(actor: Principal, vaultId: string) {
  if (actor.vaultGrants?.find((grant) => grant.vaultId === vaultId)?.grant !== "owner") {
    throw notFound();
  }
  return db
    .select({
      userId: users.id,
      displayName: users.displayName,
      grant: vaultGrants.grant,
    })
    .from(vaultGrants)
    .innerJoin(users, eq(users.id, vaultGrants.userId))
    .where(eq(vaultGrants.vaultId, vaultId))
    .orderBy(users.displayName);
}

export async function setVaultGrant(
  actor: Principal,
  vaultId: string,
  userId: string,
  grant: "viewer" | "editor" | "reviewer" | "owner",
) {
  if (actor.vaultGrants?.find((item) => item.vaultId === vaultId)?.grant !== "owner") {
    throw notFound();
  }
  if (actor.userId === userId && grant !== "owner") {
    throw new ApiError(409, "self_lockout", "Vault owner không thể tự hạ quyền.");
  }
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!target) throw notFound();
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ grant: vaultGrants.grant })
      .from(vaultGrants)
      .where(and(eq(vaultGrants.vaultId, vaultId), eq(vaultGrants.userId, userId)));
    await tx
      .insert(vaultGrants)
      .values({ vaultId, userId, grant, grantedBy: actor.userId })
      .onConflictDoUpdate({
        target: [vaultGrants.vaultId, vaultGrants.userId],
        set: { grant, grantedBy: actor.userId },
      });
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "vault.grant.change",
      targetType: "vault",
      targetId: vaultId,
      details: { userId, from: before?.grant ?? null, to: grant },
    });
  });
}

/** How many enabled admins besides this one — the lockout guard's question. */
async function otherEnabledAdmins(userId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(eq(users.role, "admin_op"), isNull(users.disabledAt), sql`${users.id} <> ${userId}`),
    );
  return n;
}

export async function setUserRole(actor: Principal, userId: string, role: Role) {
  authorize(actor, "admin.users.manage", { kind: "write" });
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) throw notFound();
  if (target.role === role) return; // already true — the admin's goal is met
  if (target.role === "admin_op" && (await otherEnabledAdmins(userId)) === 0) {
    throw new ApiError(409, "last_admin", "Không thể hạ vai trò quản trị viên cuối cùng.");
  }
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "user.role.change",
      targetType: "user",
      targetId: userId,
      // old and new values, per authorization-design.md:151
      details: { from: target.role, to: role },
    });
  });
}

export async function setUserDisabled(actor: Principal, userId: string, disabled: boolean) {
  authorize(actor, "admin.users.manage", { kind: "write" });
  if (disabled && userId === actor.userId) {
    throw new ApiError(409, "self_disable", "Không thể tự vô hiệu hoá tài khoản của mình.");
  }
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) throw notFound();
  if (disabled && target.role === "admin_op" && (await otherEnabledAdmins(userId)) === 0) {
    throw new ApiError(409, "last_admin", "Không thể vô hiệu hoá quản trị viên cuối cùng.");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    if (disabled) await revokeUserSessions(tx, userId);
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: disabled ? "user.disable" : "user.enable",
      targetType: "user",
      targetId: userId,
      details: { email: target.email },
    });
  });
}

/**
 * The audit trail, finally read back. 32 call sites have written it since V1
 * and nothing ever selected it — an append-only table is only an
 * accountability record if someone can look. Keyset pagination on (createdAt)
 * because the table only grows.
 */
export async function listAuditEvents(actor: Principal, opts: { before?: Date; limit?: number }) {
  authorize(actor, "admin.audit.read", { kind: "read" });
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  return db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      accountability: auditEvents.accountability,
      actorName: users.displayName,
      targetType: auditEvents.targetType,
      targetId: auditEvents.targetId,
      details: auditEvents.details,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorId, users.id))
    .where(opts.before ? lt(auditEvents.createdAt, opts.before) : undefined)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}
