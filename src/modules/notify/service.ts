import { and, asc, desc, eq, gt, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import { foldName } from "@/lib/mention-fold";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { sources, sourcePhysical, spaceMembers } from "../storage/schema";
import { branches, treeNodes } from "../knowledge/schema";
import { loanTickets } from "../circulation/schema";
import { deadlines } from "../pm/schema";
import { tasks } from "../pm/schema";
import { activities } from "../activity/schema";
import { researchReadableProjectIds } from "../auth/core";
import { comments, notificationPreferences, notifications, presence } from "./schema";
import { NOTIFIED_EVENTS, notifyEvent } from "./fanout";
import { notificationLink, type NotificationLinkContext } from "./links";

// Module: notify — comments anchored to work objects, the in-app notification
// center, and per-user channel preferences.
// Comment visibility DELEGATES to the anchor object's read scope
// (notify.comment.create scope = "anchor"): a
// non-visible anchor throws the anchor's own read denial → 404, never 403,
// so cross-space existence is not leaked.
//
// Anchors are Source, Tree Node and Deadline. A Loan Ticket is NOT an anchor:
// a loan carries a factual register entry (borrower, request time, approver,
// hand-over, due date, return) on the Catalog Item Detail screen instead of a
// discussion thread — owner decision 2026-07-20, enforced by the CHECK in
// drizzle/0002_comments_drop_loan_anchor.sql, so a POST anchored to a loan
// ticket is a 400 invalid_anchor at the route boundary.

export type AnchorType = (typeof comments.$inferSelect)["anchorType"];

/**
 * The anchor-scope delegation: load the anchor and run the SAME read
 * authorize the anchor's own detail endpoint uses. Missing anchor → 404.
 */
async function authorizeAnchorRead(
  actor: Principal,
  anchorType: AnchorType,
  anchorId: string,
): Promise<void> {
  switch (anchorType) {
    case "source": {
      const [source] = await db.select().from(sources).where(eq(sources.id, anchorId));
      if (!source) throw notFound();
      authorize(actor, "storage.library.browse", { spaceId: source.spaceId, kind: "read" });
      return;
    }
    case "tree_node": {
      const [node] = await db
        .select({
          scope: branches.scope,
          ownerUserId: branches.ownerUserId,
          spaceId: branches.spaceId,
        })
        .from(treeNodes)
        .innerJoin(branches, eq(branches.id, treeNodes.branchId))
        .where(eq(treeNodes.id, anchorId));
      if (!node) throw notFound();
      if (node.scope === "personal") {
        if (node.ownerUserId !== actor.userId) throw notFound();
      } else {
        authorize(actor, "knowledge.space.read", { spaceId: node.spaceId!, kind: "read" });
      }
      return;
    }
    case "deadline": {
      const [deadline] = await db.select().from(deadlines).where(eq(deadlines.id, anchorId));
      if (!deadline) throw notFound();
      authorize(actor, "pm.deadline.read", { spaceId: deadline.spaceId, kind: "read" });
      return;
    }
    case "activity": {
      const [activity] = await db.select().from(activities).where(eq(activities.id, anchorId));
      if (!activity) throw notFound();
      authorize(actor, "project.activity.read", { spaceId: activity.projectId, kind: "read" });
      return;
    }
    case "task": {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, anchorId));
      if (!task?.projectId) throw notFound();
      authorize(actor, "pm.project_task.read", { spaceId: task.projectId, kind: "read" });
      return;
    }
  }
}

/**
 * The shared read gate for target collaboration adapters. It deliberately
 * retains the comment domain's historical anchor permissions instead of
 * treating target research-read access as collaboration access.
 */
export async function authorizeCommentContext(
  actor: Principal,
  anchorType: AnchorType,
  anchorId: string,
): Promise<void> {
  authorize(actor, "notify.comment.create", { kind: "read" });
  await authorizeAnchorRead(actor, anchorType, anchorId);
}

// ---------------------------------------------------------------------------
// Inline @mentions
// ---------------------------------------------------------------------------
// The comment BODY is the source of truth: a member types "@Tên" in the text
// and the server resolves it (owner decision 2026-07-20 — the checkbox list of
// members is gone from the UI). The RESULT is written to comments.mentions
// exactly as the old picker wrote it, so the dispatcher and the notification
// matrix row "Comment mentioning a member → mentioned member" are untouched.
//
// A mention that cannot be resolved — misspelt name, someone who cannot see
// the anchor, two members sharing a display name — is simply not a mention.
// It is never an error: refusing to save a comment because a name was typed
// loosely would be a worse product than quietly not notifying anyone.

type AnchorAudience = { spaceId: string | null; ownerUserId: string | null };

/** The exact audience boundary inherited by comments and @mention choices. */
async function anchorAudience(anchorType: AnchorType, anchorId: string): Promise<AnchorAudience> {
  switch (anchorType) {
    case "source": {
      const [row] = await db
        .select({ spaceId: sources.spaceId })
        .from(sources)
        .where(eq(sources.id, anchorId));
      return { spaceId: row?.spaceId ?? null, ownerUserId: null };
    }
    case "deadline": {
      const [row] = await db
        .select({ spaceId: deadlines.spaceId })
        .from(deadlines)
        .where(eq(deadlines.id, anchorId));
      return { spaceId: row?.spaceId ?? null, ownerUserId: null };
    }
    case "tree_node": {
      const [row] = await db
        .select({
          scope: branches.scope,
          spaceId: branches.spaceId,
          ownerUserId: branches.ownerUserId,
        })
        .from(treeNodes)
        .innerJoin(branches, eq(branches.id, treeNodes.branchId))
        .where(eq(treeNodes.id, anchorId));
      return row?.scope === "personal"
        ? { spaceId: null, ownerUserId: row.ownerUserId }
        : { spaceId: row?.spaceId ?? null, ownerUserId: null };
    }
    case "activity": {
      const [row] = await db
        .select({ spaceId: activities.projectId })
        .from(activities)
        .where(eq(activities.id, anchorId));
      return { spaceId: row?.spaceId ?? null, ownerUserId: null };
    }
    case "task": {
      const [row] = await db
        .select({ spaceId: tasks.projectId })
        .from(tasks)
        .where(eq(tasks.id, anchorId));
      return { spaceId: row?.spaceId ?? null, ownerUserId: null };
    }
  }
}

/**
 * Longest-name-first scan over the body. Matched spans are consumed so that
 * "@Lan Anh" cannot also count as a mention of "Lan"; a name must end on a
 * non-letter/digit so "@Lan" does not fire inside "@Lanh".
 *
 * Comparison goes through foldName, so case and Vietnamese diacritics are both
 * ignored — "@pham thu huong" reaches Phạm Thu Hương. The fold is
 * length-preserving because this walks the folded string and blanks spans by
 * those indices.
 */
function matchMentions(
  body: string,
  candidates: ReadonlyArray<{ id: string; displayName: string }>,
): string[] {
  const byName = new Map<string, string[]>();
  for (const c of candidates) {
    const key = foldName(c.displayName.trim());
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), c.id]);
  }
  let hay = foldName(body);
  const boundary = /[\p{L}\p{N}]/u;
  const found = new Set<string>();
  for (const name of [...byName.keys()].sort((a, b) => b.length - a.length)) {
    const ids = byName.get(name)!;
    const needle = `@${name}`;
    let from = 0;
    for (;;) {
      const at = hay.indexOf(needle, from);
      if (at < 0) break;
      const after = hay[at + needle.length];
      if (after === undefined || !boundary.test(after)) {
        // Ambiguous display name → consume the span but notify no one.
        if (ids.length === 1) found.add(ids[0]);
        // Blank the matched span so a shorter name nested in it ("Lan" inside
        // "@Lan Anh") cannot claim the same text a second time.
        hay = hay.slice(0, at) + " ".repeat(needle.length) + hay.slice(at + needle.length);
        from = at + needle.length;
      } else {
        from = at + 1;
      }
    }
  }
  return [...found];
}

/** Enabled members who can reopen this collaboration context. */
async function mentionCandidates(anchorType: AnchorType, anchorId: string) {
  const audience = await anchorAudience(anchorType, anchorId);
  const enabled = await db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(isNull(users.disabledAt));
  if (audience.ownerUserId) return enabled.filter((user) => user.id === audience.ownerUserId);
  if (!audience.spaceId) return enabled;
  const members = await db
    .select({ userId: spaceMembers.userId })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, audience.spaceId));
  const inSpace = new Set(members.map((m) => m.userId));
  return enabled.filter((user) => inSpace.has(user.id));
}

/**
 * The same list the resolver will match against, for the comment box's
 * suggestions. It has to be this list and not "everyone enabled": suggesting a
 * member the resolver then cannot see would put the reader back where they
 * started — a mention that looks accepted and silently notifies nobody.
 */
export async function listMentionCandidates(
  actor: Principal,
  anchorType: AnchorType,
  anchorId: string,
) {
  await authorizeCommentContext(actor, anchorType, anchorId);
  const rows = await mentionCandidates(anchorType, anchorId);
  return rows.map((r) => ({ id: r.id, displayName: r.displayName }));
}

/** Display names for the mentioned ids, so a stored comment still reads right. */
async function displayNamesById(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(inArray(users.id, [...ids]));
  return new Map(rows.map((r) => [r.id, r.displayName]));
}

/** Threaded list, oldest first; caller must see the anchor (else 404). */
export async function listComments(actor: Principal, anchorType: AnchorType, anchorId: string) {
  await authorizeCommentContext(actor, anchorType, anchorId);
  const rows = await db
    .select({
      id: comments.id,
      anchorType: comments.anchorType,
      anchorId: comments.anchorId,
      parentCommentId: comments.parentCommentId,
      authorId: comments.authorId,
      authorName: users.displayName, // additive over the contract Comment shape
      body: comments.body,
      mentions: comments.mentions,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.anchorType, anchorType), eq(comments.anchorId, anchorId)))
    .orderBy(asc(comments.createdAt));
  // Names travel with the row (additive over the contract Comment shape) so
  // the reader can highlight the @Tên tokens already written in the body.
  const names = await displayNamesById([...new Set(rows.flatMap((r) => r.mentions))]);
  return rows.map((r) => ({
    ...r,
    mentionNames: r.mentions.map((id) => names.get(id)).filter((n): n is string => Boolean(n)),
  }));
}

export async function createComment(
  actor: Principal,
  input: {
    anchorType: AnchorType;
    anchorId: string;
    body: string;
    parentCommentId?: string;
  },
) {
  authorize(actor, "notify.comment.create", { kind: "write" });
  // Anchor delegation runs as a READ: a non-visible anchor is a 404.
  await authorizeAnchorRead(actor, input.anchorType, input.anchorId);

  if (input.parentCommentId) {
    const [parent] = await db.select().from(comments).where(eq(comments.id, input.parentCommentId));
    if (!parent || parent.anchorType !== input.anchorType || parent.anchorId !== input.anchorId) {
      throw new ApiError(
        400,
        "invalid_parent_comment",
        "The parent comment belongs to a different item.",
      );
    }
  }
  // Mentions come out of the text itself, against members who can see this
  // anchor. Nothing matched → no mention, never an error.
  // (The dispatcher already drops the author from the recipient list, so a
  // self-mention stays faithful in the record without notifying anyone.)
  const mentionIds = matchMentions(
    input.body,
    await mentionCandidates(input.anchorType, input.anchorId),
  );

  const comment = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(comments)
      .values({
        anchorType: input.anchorType,
        anchorId: input.anchorId,
        parentCommentId: input.parentCommentId ?? null,
        authorId: actor.userId,
        body: input.body,
        mentions: mentionIds,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "comment.create",
      targetType: "comment",
      targetId: created.id,
      details: { anchorType: input.anchorType, anchorId: input.anchorId, mentions: mentionIds },
    });
    // comment.created carries the mentions; the fan-out turns them into
    // in-app notifications per the matrix, in this same transaction.
    await notifyEvent(tx, "comment.created", {
      commentId: created.id,
      anchorType: input.anchorType,
      anchorId: input.anchorId,
      authorId: actor.userId,
      mentions: mentionIds,
    });
    return created;
  });

  return comment;
}

// ---------------------------------------------------------------------------
// Notification center
// ---------------------------------------------------------------------------

/**
 * The most recent hundred. That ceiling is deliberate — nobody scrolls a
 * notification list into last month — but it used to be invisible: the screen
 * simply ended, with no way to tell "you have a hundred" from "you have
 * exactly this many". NOTIFICATION_LIMIT is exported so the screen can notice
 * a full page and say so.
 */
export const NOTIFICATION_LIMIT = 100;

export async function listNotifications(actor: Principal, unreadOnly = false) {
  return db
    .select()
    .from(notifications)
    .where(
      unreadOnly
        ? and(eq(notifications.userId, actor.userId), isNull(notifications.readAt))
        : eq(notifications.userId, actor.userId),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFICATION_LIMIT);
}

/**
 * Hydrate the one database fact the pure link resolver cannot know, ONCE per
 * page render rather than per row: which target context each notification can
 * still open. Read-only and self-scoped — it only ever looks at ids the
 * viewer's own notifications already contain, then filters paths through the
 * viewer's current Project access.
 */
export async function buildNotificationLinkContext(
  actor: Principal,
  notes: ReadonlyArray<{ eventType: string; payload: unknown }>,
): Promise<NotificationLinkContext> {
  const ticketIds = new Set<string>();
  const sourceIds = new Set<string>();
  const nodeIds = new Set<string>();
  const deadlineIds = new Set<string>();
  const activityIds = new Set<string>();
  const taskIds = new Set<string>();
  const pick = (p: Record<string, unknown>, key: string): string | null =>
    typeof p[key] === "string" && p[key] ? (p[key] as string) : null;

  for (const note of notes) {
    const p = (note.payload ?? {}) as Record<string, unknown>;
    const anchorType = pick(p, "anchorType");
    const anchorId = pick(p, "anchorId");
    if (anchorType === "source" && anchorId) sourceIds.add(anchorId);
    if (anchorType === "tree_node" && anchorId) nodeIds.add(anchorId);
    if (anchorType === "deadline" && anchorId) deadlineIds.add(anchorId);
    if (anchorType === "activity" && anchorId) activityIds.add(anchorId);
    if (anchorType === "task" && anchorId) taskIds.add(anchorId);
    if (note.eventType === "source.processing_failed") {
      const sourceId = pick(p, "sourceId");
      if (sourceId) sourceIds.add(sourceId);
    }
    if (note.eventType === "tree.node.published") {
      const nodeId = pick(p, "nodeId");
      if (nodeId) nodeIds.add(nodeId);
    }
    if (note.eventType === "deadline.approaching" || note.eventType === "deadline.created") {
      const deadlineId = pick(p, "deadlineId");
      if (deadlineId) deadlineIds.add(deadlineId);
    }
    if (note.eventType.startsWith("loan.")) {
      // Only tickets whose payload lacks sourceId need the lookup.
      const sourceId = pick(p, "sourceId");
      if (sourceId) {
        sourceIds.add(sourceId);
      } else {
        const id = pick(p, "ticketId");
        if (id) ticketIds.add(id);
      }
    }
  }

  const ticketSourceIds: Record<string, string> = {};
  if (ticketIds.size > 0) {
    const rows = await db
      .select({ id: loanTickets.id, sourceId: sourcePhysical.sourceId })
      .from(loanTickets)
      .innerJoin(sourcePhysical, eq(loanTickets.itemId, sourcePhysical.id))
      .where(inArray(loanTickets.id, [...ticketIds]));
    for (const row of rows) {
      ticketSourceIds[row.id] = row.sourceId;
      sourceIds.add(row.sourceId);
    }
  }

  const [researchIds, sourceRows, nodeRows, deadlineRows, activityRows, taskRows, operationalRows] =
    await Promise.all([
      researchReadableProjectIds(actor),
      sourceIds.size
        ? db
            .select({ id: sources.id, projectId: sources.spaceId, title: sources.title })
            .from(sources)
            .where(inArray(sources.id, [...sourceIds]))
        : [],
      nodeIds.size
        ? db
            .select({ id: treeNodes.id, projectId: treeNodes.projectId, title: treeNodes.title })
            .from(treeNodes)
            .where(inArray(treeNodes.id, [...nodeIds]))
        : [],
      deadlineIds.size
        ? db
            .select({ id: deadlines.id, projectId: deadlines.spaceId, title: deadlines.title })
            .from(deadlines)
            .where(inArray(deadlines.id, [...deadlineIds]))
        : [],
      activityIds.size
        ? db
            .select({ id: activities.id, projectId: activities.projectId, title: activities.title })
            .from(activities)
            .where(inArray(activities.id, [...activityIds]))
        : [],
      taskIds.size
        ? db
            .select({ id: tasks.id, projectId: tasks.projectId, title: tasks.title })
            .from(tasks)
            .where(inArray(tasks.id, [...taskIds]))
        : [],
      db
        .select({ projectId: spaceMembers.spaceId })
        .from(spaceMembers)
        .where(eq(spaceMembers.userId, actor.userId)),
    ]);
  const readable = new Set(researchIds);
  const operational = new Set(operationalRows.map((row) => row.projectId));
  const anchorHrefs: Record<string, string> = {};
  const anchorTitles: Record<string, string> = {};
  for (const row of nodeRows) {
    if (row.projectId && readable.has(row.projectId)) {
      anchorHrefs[`tree_node:${row.id}`] = `/app/projects/${row.projectId}/notes/${row.id}`;
      anchorTitles[`tree_node:${row.id}`] = row.title;
    }
  }
  for (const row of sourceRows) {
    if (readable.has(row.projectId)) {
      anchorHrefs[`source:${row.id}`] = `/app/projects/${row.projectId}/materials/${row.id}`;
      anchorTitles[`source:${row.id}`] = row.title;
    }
  }
  // Target Calendar is intentionally membership-bound. A Core-only reader
  // does not receive a deadline path merely because a notification is old.
  for (const row of deadlineRows) {
    if (operational.has(row.projectId)) {
      anchorHrefs[`deadline:${row.id}`] = `/app/calendar/deadlines/${row.id}`;
      anchorTitles[`deadline:${row.id}`] = row.title;
    }
  }
  for (const row of activityRows) {
    if (operational.has(row.projectId)) {
      anchorHrefs[`activity:${row.id}`] = `/app/projects/${row.projectId}/activities/${row.id}`;
      anchorTitles[`activity:${row.id}`] = row.title;
    }
  }
  for (const row of taskRows) {
    if (row.projectId && operational.has(row.projectId)) {
      anchorHrefs[`task:${row.id}`] = `/app/projects/${row.projectId}/tasks/${row.id}`;
      anchorTitles[`task:${row.id}`] = row.title;
    }
  }

  return { anchorHrefs, anchorTitles, ticketSourceIds, viewerRole: actor.role };
}

/** Rows ready to render: the notification plus its resolved jump-to link. */
export async function listNotificationsWithLinks(actor: Principal, limit?: number) {
  const notes = await listNotifications(actor);
  const rows = typeof limit === "number" ? notes.slice(0, limit) : notes;
  const ctx = await buildNotificationLinkContext(actor, rows);
  return rows.map((n) => ({ ...n, link: notificationLink(n.eventType, n.payload, ctx) }));
}

export async function unreadCount(actor: Principal): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, actor.userId), isNull(notifications.readAt)));
  return rows.length;
}

/** Mark-read is self-scoped: another user's notification reads as 404. */
export async function markNotificationRead(actor: Principal, notificationId: string) {
  const [note] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
  if (!note || note.userId !== actor.userId) throw notFound();
  if (!note.readAt) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, notificationId));
  }
}

// ---------------------------------------------------------------------------
// Preferences — absent row means the built-in default matrix
// ---------------------------------------------------------------------------

/** Per-event on/off, stored as a channels row so the table needs no change. */
export async function getPreferences(actor: Principal) {
  authorize(actor, "notify.preferences.manage", { userId: actor.userId, kind: "read" });
  const stored = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, actor.userId));
  const byEvent = new Map(stored.map((p) => [p.eventType, p.channels as string[]]));
  return [...NOTIFIED_EVENTS].map((eventType) => ({
    eventType,
    enabled: byEvent.has(eventType) ? byEvent.get(eventType)!.includes("in_app") : true,
  }));
}

export async function updatePreferences(
  actor: Principal,
  prefs: Array<{ eventType: string; enabled: boolean }>,
) {
  authorize(actor, "notify.preferences.manage", { userId: actor.userId, kind: "write" });
  for (const p of prefs) {
    if (!NOTIFIED_EVENTS.has(p.eventType)) {
      throw new ApiError(400, "unknown_event_type", "Unknown notification event type.", {
        eventType: p.eventType,
      });
    }
  }
  await db.transaction(async (tx) => {
    for (const p of prefs) {
      const channels = p.enabled ? ["in_app"] : [];
      await tx
        .insert(notificationPreferences)
        .values({ userId: actor.userId, eventType: p.eventType, channels })
        .onConflictDoUpdate({
          target: [notificationPreferences.userId, notificationPreferences.eventType],
          set: { channels },
        });
    }
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "notification.preferences.update",
      targetType: "user",
      targetId: actor.userId,
      details: { prefs },
    });
  });
  return getPreferences(actor);
}

/**
 * Enabled members (id + display name only). The comment box no longer uses
 * this — mentions are typed inline as @Tên and resolved server-side — but the
 * Board's assignee picker still needs the roster.
 */
export async function listMentionableUsers() {
  return db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(isNull(users.disabledAt))
    .orderBy(asc(users.displayName));
}

// ---------------------------------------------------------------------------
// Presence: who has this page open right now.
//
// The version check already refuses a save built on stale content, but it does
// so AFTER the fact — the loser is told to reload and retypes their paragraph.
// This is the warning before the fact, and it is deliberately never anonymous
// (owner decision 2026-07-21): "someone else is editing this" is a warning you
// cannot act on, while "Lê Văn Minh is editing this" is one you can, by
// walking over to them.
// ---------------------------------------------------------------------------

/** Older than this and a reader is treated as gone. Two missed heartbeats. */
export const PRESENCE_TTL_MS = 90_000;

/**
 * Say "I am here". Self-scoped by construction — a caller can only ever write
 * their own row, so this needs no permission key beyond being signed in, and
 * the page key is opaque: this module never resolves it, so it can never leak
 * the title of something the viewer could not otherwise see.
 */
export async function markPresence(actor: Principal, pageKey: string): Promise<void> {
  const key = pageKey.trim();
  if (!key || key.length > 200) {
    throw new ApiError(400, "invalid_page", "Invalid page.");
  }
  await db
    .insert(presence)
    .values({ userId: actor.userId, pageKey: key, seenAt: new Date() })
    .onConflictDoUpdate({
      target: [presence.userId, presence.pageKey],
      set: { seenAt: new Date() },
    });
}

/** Everyone else currently on this page. The caller is never in their own list. */
export async function listPresence(actor: Principal, pageKey: string) {
  const since = new Date(Date.now() - PRESENCE_TTL_MS);
  return db
    .select({ userId: presence.userId, displayName: users.displayName, seenAt: presence.seenAt })
    .from(presence)
    .innerJoin(users, eq(presence.userId, users.id))
    .where(
      and(
        eq(presence.pageKey, pageKey),
        ne(presence.userId, actor.userId),
        gt(presence.seenAt, since),
        isNull(users.disabledAt),
      ),
    )
    .orderBy(desc(presence.seenAt));
}

/**
 * Drop a row when someone leaves. Best-effort: a closed laptop never sends
 * this, which is exactly why listPresence filters on age as well rather than
 * trusting the table to be tidy.
 */
export async function clearPresence(actor: Principal, pageKey: string): Promise<void> {
  await db
    .delete(presence)
    .where(and(eq(presence.userId, actor.userId), eq(presence.pageKey, pageKey)));
}
