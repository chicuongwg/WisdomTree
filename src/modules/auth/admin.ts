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
import { users, type Role } from "./schema";
import { recordAudit } from "../audit/service";
import { auditEvents } from "../audit/schema";

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
    })
    .from(users)
    .orderBy(users.displayName);
}

/** How many enabled admins besides this one — the lockout guard's question. */
async function otherEnabledAdmins(userId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin_op"), isNull(users.disabledAt), sql`${users.id} <> ${userId}`));
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
