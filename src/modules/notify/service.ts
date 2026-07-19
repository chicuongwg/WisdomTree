import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { sources } from "../storage/schema";
import { treeNodes } from "../knowledge/schema";
import { catalogItems } from "../catalog/schema";
import { loanTickets } from "../circulation/schema";
import { deadlines } from "../pm/schema";
import { comments, notificationPreferences, notifications } from "./schema";
import { DEFAULT_CHANNELS, dispatchOutbox, type Channel } from "./dispatcher";

// Module: notify — comments anchored to work objects, the in-app notification
// center, and per-user channel preferences (docs/system/notifications.md).
// Comment visibility DELEGATES to the anchor object's read scope
// (authorization-design.md: notify.comment.create scope = "anchor"): a
// non-visible anchor throws the anchor's own read denial → 404, never 403,
// so cross-space existence is not leaked.

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
    case "loan_ticket": {
      const [row] = await db
        .select({ spaceId: catalogItems.spaceId })
        .from(loanTickets)
        .innerJoin(catalogItems, eq(loanTickets.itemId, catalogItems.id))
        .where(eq(loanTickets.id, anchorId));
      if (!row) throw notFound();
      authorize(actor, "catalog.browse", { spaceId: row.spaceId, kind: "read" });
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

/** Threaded list, oldest first; caller must see the anchor (else 404). */
export async function listComments(actor: Principal, anchorType: AnchorType, anchorId: string) {
  authorize(actor, "notify.comment.create", { kind: "read" });
  await authorizeAnchorRead(actor, anchorType, anchorId);
  return db
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
}

export async function createComment(
  actor: Principal,
  input: {
    anchorType: AnchorType;
    anchorId: string;
    body: string;
    parentCommentId?: string;
    mentions?: string[];
  },
) {
  authorize(actor, "notify.comment.create", { kind: "write" });
  // Anchor delegation runs as a READ: a non-visible anchor is a 404.
  await authorizeAnchorRead(actor, input.anchorType, input.anchorId);

  if (input.parentCommentId) {
    const [parent] = await db.select().from(comments).where(eq(comments.id, input.parentCommentId));
    if (
      !parent ||
      parent.anchorType !== input.anchorType ||
      parent.anchorId !== input.anchorId
    ) {
      throw new ApiError(400, "invalid_parent_comment", "Bình luận gốc không thuộc mục này.");
    }
  }
  // Mentions must be real, enabled members; unknown ids are rejected early.
  const mentionIds = [...new Set(input.mentions ?? [])];
  if (mentionIds.length > 0) {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, mentionIds), isNull(users.disabledAt)));
    if (found.length !== mentionIds.length) {
      throw new ApiError(400, "invalid_mentions", "Có thành viên được nhắc đến không tồn tại.");
    }
  }

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

  void dispatchOutbox();
  return comment;
}

// ---------------------------------------------------------------------------
// Notification center
// ---------------------------------------------------------------------------

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
    .limit(100);
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

const CHANNELS: Channel[] = ["in_app", "email", "zalo"];

/** Stored overrides merged over the default matrix, one row per event type. */
export async function getPreferences(actor: Principal) {
  authorize(actor, "notify.preferences.manage", { userId: actor.userId, kind: "read" });
  const stored = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, actor.userId));
  const byEvent = new Map(stored.map((p) => [p.eventType, p.channels as Channel[]]));
  return Object.entries(DEFAULT_CHANNELS).map(([eventType, defaults]) => ({
    eventType,
    channels: byEvent.get(eventType) ?? defaults,
  }));
}

export async function updatePreferences(
  actor: Principal,
  prefs: Array<{ eventType: string; channels: string[] }>,
) {
  authorize(actor, "notify.preferences.manage", { userId: actor.userId, kind: "write" });
  for (const p of prefs) {
    if (!(p.eventType in DEFAULT_CHANNELS)) {
      throw new ApiError(400, "unknown_event_type", "Loại sự kiện thông báo không hợp lệ.", {
        eventType: p.eventType,
      });
    }
    if (!Array.isArray(p.channels) || p.channels.some((c) => !CHANNELS.includes(c as Channel))) {
      throw new ApiError(400, "unknown_channel", "Kênh thông báo không hợp lệ.");
    }
  }
  await db.transaction(async (tx) => {
    for (const p of prefs) {
      await tx
        .insert(notificationPreferences)
        .values({ userId: actor.userId, eventType: p.eventType, channels: p.channels })
        .onConflictDoUpdate({
          target: [notificationPreferences.userId, notificationPreferences.eventType],
          set: { channels: p.channels },
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

/** Mention picker options: enabled members (id + display name only). */
export async function listMentionableUsers() {
  return db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(isNull(users.disabledAt))
    .orderBy(asc(users.displayName));
}
