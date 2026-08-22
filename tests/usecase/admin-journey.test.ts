import assert from "node:assert/strict";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/modules/auth/schema";
import {
  inviteUser,
  listAuditEvents,
  listUsers,
  setUserDisabled,
  setUserRole,
} from "@/modules/auth/admin";
import { resolveSessionToken } from "@/modules/auth/session";
import { ApiError } from "@/lib/errors";
import { issueTestSession, principalFor } from "../setup";

// USE CASE — an account's life under the admin: invited (claimable by a
// first Google login), promoted, disabled (sessions die immediately),
// re-enabled — with the audit trail recording each step and the lockout
// guards refusing the moves that would strand the system.

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");

  // 1. Invite. The row exists with the invited-sentinel sub; the list marks
  // it as not-yet-signed-in.
  const email = `moi.${Date.now()}@example.org`;
  const created = await inviteUser(admin, {
    email,
    displayName: "Thành viên mới",
    role: "user",
  });
  const listed = (await listUsers(admin)).find((u) => u.id === created.id);
  assert.ok(listed);
  assert.equal(listed.invited, true);

  // 2. Promote to editor; the audit trail records old and new values.
  await setUserRole(admin, created.id, "editor");
  const audit = await listAuditEvents(admin, { limit: 20 });
  const roleChange = audit.find(
    (row) => row.action === "user.role.change" && row.targetId === created.id,
  );
  assert.deepEqual(roleChange?.details, { from: "user", to: "editor" });

  // 3. Disable: the account's live sessions die in the same transaction.
  const session = await issueTestSession(email);
  assert.ok(await resolveSessionToken(session.token), "session lives before disable");
  await setUserDisabled(admin, created.id, true);
  assert.equal(await resolveSessionToken(session.token), null, "disable revokes sessions");

  // 4. Re-enable restores access rights (a NEW session works; the revoked
  // one stays dead).
  await setUserDisabled(admin, created.id, false);
  assert.equal(await resolveSessionToken(session.token), null);
  const fresh = await issueTestSession(email);
  assert.ok(await resolveSessionToken(fresh.token));

  // 5. Lockout guards: the admin cannot disable themselves, and the last
  // enabled admin can be neither demoted nor disabled.
  const code = (c: string) => (err: unknown) => err instanceof ApiError && err.code === c;
  await assert.rejects(setUserDisabled(admin, admin.userId, true), code("self_disable"));
  const enabledAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin_op"), isNull(users.disabledAt)));
  if (enabledAdmins.length === 1) {
    await assert.rejects(setUserRole(admin, admin.userId, "user"), code("last_admin"));
  }
}
