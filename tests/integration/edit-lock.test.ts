import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { branches, nodeEditLocks } from "@/modules/knowledge/schema";
import {
  acquireEditLock,
  createNode,
  EDIT_LOCK_TTL_MS,
  getEditLock,
  releaseEditLock,
  updateNode,
} from "@/modules/knowledge/service";
import { ApiError } from "@/lib/errors";
import { principalFor } from "../setup";

// Single-writer editing: one session holds a node's lock; anyone else (the
// same user in another session included) is refused, both at acquire and at
// save. A stale heartbeat frees the lock.

const sessionKey = () => randomBytes(16).toString("hex");

export async function run() {
  const lan = await principalFor("lan@wisdomtree.local");
  const [personalBranch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.scope, "personal"), eq(branches.ownerUserId, lan.userId)))
    .limit(1);
  assert.ok(personalBranch);
  const node = await createNode(lan, {
    branchId: personalBranch.id,
    title: `Edit lock target ${Date.now()}`,
    contentMd: "Lock me.",
  });

  const sessionA = sessionKey();
  const sessionB = sessionKey();

  // A takes the lock; re-acquiring from A is the heartbeat, not a conflict.
  assert.equal((await acquireEditLock(lan, node.id, sessionA)).locked, true);
  const kept = await acquireEditLock(lan, node.id, sessionA);
  assert.ok(kept.locked && kept.ownedByMe);

  // B — the SAME user, different login session — is refused and told who
  // holds it.
  const refused = await acquireEditLock(lan, node.id, sessionB);
  assert.ok(refused.locked && !refused.ownedByMe);
  assert.equal(refused.holderName, "Trần Thị Lan");

  // The save path enforces the lock too: B cannot write, A can.
  await assert.rejects(
    updateNode(lan, node.id, { contentMd: "B tries.", expectedVersion: node.version }, sessionB),
    (err: unknown) => err instanceof ApiError && err.code === "edit_locked",
  );
  const saved = await updateNode(
    lan,
    node.id,
    { contentMd: "A saves.", expectedVersion: node.version },
    sessionA,
  );
  assert.ok("version" in saved);

  // Release frees it only for the holding session; then B may take it.
  await releaseEditLock(lan, node.id, sessionB); // no-op: not the holder
  assert.equal((await getEditLock(lan, node.id)).locked, true);
  await releaseEditLock(lan, node.id, sessionA);
  assert.equal((await getEditLock(lan, node.id)).locked, false);
  assert.equal((await acquireEditLock(lan, node.id, sessionB)).locked, true);

  // A stale heartbeat means the tab is gone: the next acquirer takes over.
  await db
    .update(nodeEditLocks)
    .set({ heartbeatAt: new Date(Date.now() - EDIT_LOCK_TTL_MS - 1000) })
    .where(eq(nodeEditLocks.nodeId, node.id));
  assert.equal((await getEditLock(lan, node.id)).locked, false, "stale lock reads as free");
  const takeover = await acquireEditLock(lan, node.id, sessionA);
  assert.ok(takeover.locked && takeover.ownedByMe);
  await releaseEditLock(lan, node.id, sessionA);
}
