// Admin-side user management — the other half of the users table's write
// story (profile.ts is the member's own half). Everything here is admin_op
// under admin.users.manage, and every change lands in the audit trail;
// role changes record old and new values here rather than trusting callers.
//
// What this file must never do: touch google_sub (the identity provider's),
// or let an admin disable or demote THEMSELVES into a lockout — the last
// admin problem. Both are guarded below.

import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "./principal";
import { authorize } from "./authorize";
import { users, type Role } from "./schema";
import { revokeUserSessions } from "./session";
import { recordAudit } from "../audit/service";
import { auditEvents } from "../audit/schema";
import { invitedSentinel } from "./oidc";
import { vaults } from "../knowledge/schema";

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
  if (!["user", "editor", "admin_op"].includes(role)) {
    throw new ApiError(400, "invalid_role", "Invalid role.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "invalid_email", "A valid email address is required.");
  }
  if (!displayName) {
    throw new ApiError(400, "invalid_name", "A display name is required.");
  }
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new ApiError(409, "email_taken", "An account with this email already exists.");
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ googleSub: invitedSentinel(), email, displayName, role })
      .returning({ id: users.id });
    await tx
      .insert(vaults)
      .values({ kind: "personal", ownerUserId: created.id, name: displayName });
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
  return db
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
    throw new ApiError(409, "last_admin", "Cannot demote the last administrator.");
  }
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "user.role.change",
      targetType: "user",
      targetId: userId,
      details: { from: target.role, to: role },
    });
  });
}

export async function setUserDisabled(actor: Principal, userId: string, disabled: boolean) {
  authorize(actor, "admin.users.manage", { kind: "write" });
  if (disabled && userId === actor.userId) {
    throw new ApiError(409, "self_disable", "You cannot disable your own account.");
  }
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) throw notFound();
  if (disabled && target.role === "admin_op" && (await otherEnabledAdmins(userId)) === 0) {
    throw new ApiError(409, "last_admin", "Cannot disable the last administrator.");
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
 * The audit trail read back — an append-only table is only an accountability
 * record if someone can look. Keyset pagination on (createdAt) because the
 * table only grows.
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
