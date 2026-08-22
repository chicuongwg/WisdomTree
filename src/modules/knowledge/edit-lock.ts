import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { users } from "../auth/schema";
import { nodeEditLocks } from "./schema";

// Single-writer editing for the node editor: the open editor acquires the
// lock, re-acquires it every ~30s as a heartbeat, and releases it on leave.
// The holder is the LOGIN SESSION, not just the user — the same person in a
// second browser is a different holder and is refused too. A heartbeat older
// than the TTL means the tab is gone: the next acquirer simply takes over.

export const EDIT_LOCK_TTL_MS = Number(process.env.EDIT_LOCK_TTL_MS ?? 90_000);

const freshCutoff = () => new Date(Date.now() - EDIT_LOCK_TTL_MS);

export type EditLockState =
  | { locked: false }
  | { locked: true; holderUserId: string; holderName: string; ownedByMe: boolean };

/** The node's current live lock, for display (🔒 đang được chỉnh sửa bởi …). */
export async function getEditLock(
  actor: Principal,
  nodeId: string,
  sessionKey?: string | null,
): Promise<EditLockState> {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [row] = await db
    .select({
      userId: nodeEditLocks.userId,
      sessionKey: nodeEditLocks.sessionKey,
      holderName: users.displayName,
    })
    .from(nodeEditLocks)
    .innerJoin(users, eq(nodeEditLocks.userId, users.id))
    .where(and(eq(nodeEditLocks.nodeId, nodeId), gt(nodeEditLocks.heartbeatAt, freshCutoff())));
  if (!row) return { locked: false };
  return {
    locked: true,
    holderUserId: row.userId,
    holderName: row.holderName,
    ownedByMe: sessionKey != null && row.sessionKey === sessionKey,
  };
}

/**
 * Take (or keep) the lock. One atomic upsert: the row updates when it is
 * ours already (heartbeat) or its heartbeat has gone stale (takeover); a
 * fresh lock held by another session updates nothing and the holder is
 * reported back. Re-POSTing this IS the heartbeat — there is no second verb.
 */
export async function acquireEditLock(
  actor: Principal,
  nodeId: string,
  sessionKey: string,
): Promise<EditLockState> {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [won] = await db
    .insert(nodeEditLocks)
    .values({ nodeId, userId: actor.userId, sessionKey })
    .onConflictDoUpdate({
      target: nodeEditLocks.nodeId,
      set: {
        userId: actor.userId,
        sessionKey,
        acquiredAt: sql`now()`,
        heartbeatAt: sql`now()`,
      },
      setWhere: sql`${nodeEditLocks.sessionKey} = ${sessionKey} OR ${nodeEditLocks.heartbeatAt} < ${freshCutoff()}`,
    })
    .returning({ nodeId: nodeEditLocks.nodeId });
  if (won) return { locked: true, holderUserId: actor.userId, holderName: "", ownedByMe: true };
  return getEditLock(actor, nodeId, sessionKey);
}

/** Leave the editor: only the holding session may free the lock. */
export async function releaseEditLock(
  actor: Principal,
  nodeId: string,
  sessionKey: string,
): Promise<void> {
  await db
    .delete(nodeEditLocks)
    .where(and(eq(nodeEditLocks.nodeId, nodeId), eq(nodeEditLocks.sessionKey, sessionKey)));
}

/**
 * The save-path guard: a fresh lock held by ANOTHER session refuses the
 * write with the holder's name. No lock (or a stale one, or our own) passes —
 * the optimistic version check still guards the actual content race.
 */
export async function assertNotLockedByOther(
  nodeId: string,
  sessionKey: string | null | undefined,
): Promise<void> {
  const [row] = await db
    .select({ sessionKey: nodeEditLocks.sessionKey, holderName: users.displayName })
    .from(nodeEditLocks)
    .innerJoin(users, eq(nodeEditLocks.userId, users.id))
    .where(and(eq(nodeEditLocks.nodeId, nodeId), gt(nodeEditLocks.heartbeatAt, freshCutoff())));
  if (row && row.sessionKey !== sessionKey) {
    throw new ApiError(
      409,
      "edit_locked",
      `Locked: currently being edited by ${row.holderName}. Try again later.`,
      { holderName: row.holderName },
    );
  }
}
