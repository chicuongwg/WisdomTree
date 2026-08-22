import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/modules/auth/schema";
import { notifications } from "@/modules/notify/schema";
import { resolveSessionToken, revokeSessionToken } from "@/modules/auth/session";
import { updateProfile } from "@/modules/auth/profile";
import { listAuditEvents, listUsers } from "@/modules/auth/admin";
import { devLoginEnabled, listSignInCandidates } from "@/modules/auth/dev-login";
import { markNotificationRead } from "@/modules/notify/service";
import { ApiError } from "@/lib/errors";
import { issueTestSession, principalFor } from "../setup";

// PRIVACY — the account surface:
//   credentials at rest, session revocation, what a member may change about
//   themselves, who may enumerate accounts and read the audit trail, whose
//   notifications a member can touch, and the demo-login gate.

const notFound404 = (err: unknown) => {
  assert.ok(err instanceof ApiError);
  assert.equal(err.status, 404);
  return true;
};

export async function run() {
  const lan = await principalFor("lan@wisdomtree.local");
  const duc = await principalFor("duc@wisdomtree.local");
  const admin = await principalFor("huong@wisdomtree.local");

  // 1. Credentials at rest: the DB never holds the raw session token — only
  // its SHA-256. Knowing the DB row is not enough to forge the cookie.
  const session = await issueTestSession("lan@wisdomtree.local");
  const hash = createHash("sha256").update(session.token).digest("hex");
  const [row] = await db.select().from(sessions).where(eq(sessions.tokenHash, hash));
  assert.ok(row, "session row is found by hash");
  assert.notEqual(row.tokenHash, session.token);

  // 2. Revocation is immediate and permanent for that token.
  assert.ok(await resolveSessionToken(session.token));
  await revokeSessionToken(session.token);
  assert.equal(await resolveSessionToken(session.token), null);

  // 3. Self-service profile cannot touch identity or privilege: the API
  // accepts only displayName; role/email/google_sub stay what they were.
  const [before] = await db.select().from(users).where(eq(users.id, lan.userId));
  await updateProfile(lan, { displayName: "Trần Thị Lan" });
  const [after] = await db.select().from(users).where(eq(users.id, lan.userId));
  assert.equal(after.role, before.role);
  assert.equal(after.email, before.email);
  assert.equal(after.googleSub, before.googleSub);

  // 4. Account enumeration and the audit trail are admin-only; the denial
  // is a 404, so a member cannot even confirm the surfaces exist.
  await assert.rejects(listUsers(lan), notFound404);
  await assert.rejects(listAuditEvents(lan, {}), notFound404);
  await listUsers(admin);

  // 5. A member cannot mark someone else's notification read.
  const [note] = await db
    .insert(notifications)
    .values({ userId: duc.userId, eventType: "comment.created", payload: {} })
    .returning();
  await assert.rejects(markNotificationRead(lan, note.id), notFound404);
  await markNotificationRead(duc, note.id); // the owner can

  // 6. The demo-login door does not exist in production: the gate closes and
  // the member list stops being enumerable through it.
  const prev = process.env.NODE_ENV;
  try {
    (process.env as Record<string, string>).NODE_ENV = "production";
    assert.equal(devLoginEnabled(), false);
    assert.deepEqual(await listSignInCandidates(), []);
    (process.env as Record<string, string>).NODE_ENV = "development";
    assert.equal(devLoginEnabled(), true);
  } finally {
    if (prev === undefined) delete (process.env as Record<string, string>).NODE_ENV;
    else (process.env as Record<string, string>).NODE_ENV = prev;
  }
}
