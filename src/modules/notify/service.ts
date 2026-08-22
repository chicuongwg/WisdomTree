import { and, asc, desc, eq, gt, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import { foldName } from "@/lib/mention-fold";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { sources, sourcePhysical, spaceMembers } from "../storage/schema";
import { treeNodes } from "../knowledge/schema";
import { loanTickets } from "../circulation/schema";
import { deadlines } from "../pm/schema";
import { comments, notificationPreferences, notifications, presence } from "./schema";
import { NOTIFIED_EVENTS, kickDispatch } from "./dispatcher";
import { notificationLink, type NotificationLinkContext } from "./links";

// Module: notify — comments anchored to work objects, the in-app notification
// center, and per-user channel preferences (docs/system/notifications.md).
// Comment visibility DELEGATES to the anchor object's read scope
// (authorization-design.md: notify.comment.create scope = "anchor"): a
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
      const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, anchorId));
      if (!node) throw notFound();
      authorize(actor, "knowledge.node.read", { kind: "read" });
      return;
    }
    case "deadline": {
      const [deadline] = await db.select().from(deadlines).where(eq(deadlines.id, anchorId));
      if (!deadline) throw notFound();
      authorize(actor, "pm.deadline.read", { spaceId: deadline.spaceId, kind: "read" });
      return;
    }
  }
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

/** The space whose members can see this anchor; null = readable app-wide. */
async function anchorSpaceId(anchorType: AnchorType, anchorId: string): Promise<string | null> {
  switch (anchorType) {
    case "source": {
      const [row] = await db
        .select({ spaceId: sources.spaceId })
        .from(sources)
        .where(eq(sources.id, anchorId));
      return row?.spaceId ?? null;
    }
    case "deadline": {
      const [row] = await db
        .select({ spaceId: deadlines.spaceId })
        .from(deadlines)
        .where(eq(deadlines.id, anchorId));
      return row?.spaceId ?? null;
    }
    case "tree_node":
      // knowledge.node.read is global scope: every enabled member can see it.
      return null;
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

/**
 * Members who can see the anchor: enabled users, narrowed to the anchor's
 * space when it has one (Admin/Op reads every space, so they stay in).
 */
async function mentionCandidates(anchorType: AnchorType, anchorId: string) {
  const spaceId = await anchorSpaceId(anchorType, anchorId);
  const enabled = await db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(isNull(users.disabledAt));
  if (!spaceId) return enabled;
  const members = await db
    .select({ userId: spaceMembers.userId })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, spaceId));
  const inSpace = new Set(members.map((m) => m.userId));
  return enabled.filter((u) => u.role === "admin_op" || inSpace.has(u.id));
}

/**
 * The same list the resolver will match against, for the comment box's
 * suggestions. It has to be this list and not "everyone enabled": suggesting a
 * member the resolver then cannot see would put the reader back where they
 * started — a mention that looks accepted and silently notifies nobody.
 */
export async function listMentionCandidates(anchorType: AnchorType, anchorId: string) {
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
  authorize(actor, "notify.comment.create", { kind: "read" });
  await authorizeAnchorRead(actor, anchorType, anchorId);
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
      throw new ApiError(400, "invalid_parent_comment", "The parent comment belongs to a different item.");
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
    // comment.created carries the mentions; the dispatcher turns them into
    // notifications per the matrix (in-app + zalo by default).
    await emitOutbox(tx, "comment.created", {
      commentId: created.id,
      anchorType: input.anchorType,
      anchorId: input.anchorId,
      authorId: actor.userId,
      mentions: mentionIds,
    });
    return created;
  });

  kickDispatch();
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
 * page render rather than per row: which Library item each referenced loan
 * ticket belongs to. Read-only and self-scoped — it only ever looks at ids
 * the viewer's own notifications already contain.
 */
export async function buildNotificationLinkContext(
  actor: Principal,
  notes: ReadonlyArray<{ eventType: string; payload: unknown }>,
): Promise<NotificationLinkContext> {
  const ticketIds = new Set<string>();
  const pick = (p: Record<string, unknown>, key: string): string | null =>
    typeof p[key] === "string" && p[key] ? (p[key] as string) : null;

  for (const note of notes) {
    const p = (note.payload ?? {}) as Record<string, unknown>;
    if (note.eventType.startsWith("loan.")) {
      // Only tickets whose payload lacks sourceId need the lookup.
      if (!pick(p, "sourceId")) {
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
    for (const row of rows) ticketSourceIds[row.id] = row.sourceId;
  }

  return { ticketSourceIds, viewerRole: actor.role };
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
// Preferences — absent row means the default matrix (notifications.md)
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
