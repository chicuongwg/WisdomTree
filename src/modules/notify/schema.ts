import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../auth/schema";

// Module: notify — comments, in-app notifications, per-channel deliveries,
// and per-user preferences (docs/system/notifications.md).
// Column definitions transcribed from docs/design/database-schema.md.
// The comments append-only trigger lives in the SQL migration.

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  anchorType: text("anchor_type", {
    // Loan tickets are NOT an anchor: a loan carries a factual record on the
    // Catalog Item Detail screen, not a discussion (owner decision
    // 2026-07-20; CHECK tightened in drizzle/0002_comments_drop_loan_anchor.sql).
    enum: ["source", "tree_node", "deadline"],
  }).notNull(),
  anchorId: uuid("anchor_id").notNull(),
  parentCommentId: uuid("parent_comment_id"), // threading; self-FK in the migration
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  mentions: uuid("mentions")
    .array()
    .notNull()
    .default(sql`'{}'::uuid[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Best-effort with retry: a failed delivery after max attempts stays visible
// in the in-app center; channel outages never touch the triggering workflow.
export const notificationDeliveries = pgTable("notification_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  notificationId: uuid("notification_id")
    .notNull()
    .references(() => notifications.id),
  channel: text("channel", { enum: ["in_app", "email", "zalo"] }).notNull(),
  state: text("state", { enum: ["pending", "sent", "failed"] })
    .notNull()
    .default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Absent row means the default matrix in docs/system/notifications.md.
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventType: text("event_type").notNull(),
    channels: text("channels").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.eventType] })],
);

/**
 * Who has a page open right now. One row per (person, page), overwritten on
 * every heartbeat — this is a snapshot, never a log: nobody needs the history
 * of who read what, and keeping it would build a record of a colleague's
 * reading habits that no one asked for.
 */
export const presence = pgTable(
  "presence",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** The surface being viewed, e.g. `node:<uuid>`. Opaque to this module. */
    pageKey: text("page_key").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.pageKey] })],
);
