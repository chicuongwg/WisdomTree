import assert from "node:assert/strict";
import { resolveSessionToken, SESSION_IDLE_MS } from "@/modules/auth/session";
import { issueTestSession } from "../setup";

// Session issuance and the inactivity timeout (SESSION_IDLE_MS): the
// last_seen_at column is written on every request and READ on resolve — a
// session idle past the window reads as signed out even before its absolute
// expiry.

export async function run() {
  // A fresh session resolves to its principal.
  const fresh = await issueTestSession("huong@wisdomtree.local");
  const principal = await resolveSessionToken(fresh.token);
  assert.ok(principal, "a fresh session must resolve");
  assert.equal(principal.userId, fresh.userId);

  // A session idle past SESSION_IDLE_MS does not, even though expires_at is
  // still days away.
  const stale = await issueTestSession("huong@wisdomtree.local", {
    lastSeenAt: new Date(Date.now() - SESSION_IDLE_MS - 1000),
  });
  assert.equal(
    await resolveSessionToken(stale.token),
    null,
    "an idle session must read as signed out",
  );

  // A session past its absolute expiry does not resolve either.
  const expired = await issueTestSession("huong@wisdomtree.local", { ttlMs: -1000 });
  assert.equal(await resolveSessionToken(expired.token), null, "an expired session must not resolve");

  // A garbage token resolves to nothing rather than throwing.
  assert.equal(await resolveSessionToken("not-a-token"), null);
}
