import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  interval,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { activities } from "../activity/schema";
import { projects } from "../project/schema";
import { spaces } from "../storage/schema";

// Module: pm — deadlines, checklists, tasks, calendar tokens.

export const deadlines = pgTable("deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => spaces.id),
  title: text("title").notNull(),
  type: text("type", { enum: ["conference", "funding", "report", "milestone"] }).notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  reminderOffsets: interval("reminder_offsets")
    .array()
    .notNull()
    .default(sql`'{"7 days","1 day"}'::interval[]`),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

// The checklist and linked documents.
export const deadlineLinks = pgTable(
  "deadline_links",
  {
    deadlineId: uuid("deadline_id")
      .notNull()
      .references(() => deadlines.id),
    targetType: text("target_type", { enum: ["task", "source", "tree_node"] }).notNull(),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.deadlineId, t.targetType, t.targetId] })],
);

// Sent offsets recorded so deadline.approaching reminders are idempotent.
export const deadlineReminders = pgTable(
  "deadline_reminders",
  {
    deadlineId: uuid("deadline_id")
      .notNull()
      .references(() => deadlines.id),
    offset: interval("offset").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.deadlineId, t.offset] })],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    state: text("state", { enum: ["todo", "doing", "done", "archived"] }).notNull(),
    /** NULL is reserved for legacy Board compatibility during Project migration. */
    projectId: uuid("project_id").references(() => projects.projectId, { onDelete: "restrict" }),
    activityId: uuid("activity_id"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    /** When this task is due — the calendar views place it here. NULL = kanban only. */
    dueAt: timestamp("due_at", { withTimezone: true }),
    /** When work may open. With due_at this is a duration, not an instant. */
    startAt: timestamp("start_at", { withTimezone: true }),
    /** The task's own page: everything that does not fit in a title. */
    notes: text("notes"),
    targetType: text("target_type"), // optional link to knowledge-work object
    targetId: uuid("target_id"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    check(
      "tasks_activity_requires_project_check",
      sql`${table.activityId} IS NULL OR ${table.projectId} IS NOT NULL`,
    ),
    foreignKey({
      columns: [table.activityId, table.projectId],
      foreignColumns: [activities.id, activities.projectId],
      name: "tasks_activity_project_fk",
    }).onDelete("restrict"),
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_activity_id_idx").on(table.activityId),
  ],
);

export const calendarTokens = pgTable("calendar_tokens", {
  token: text("token").primaryKey(), // unguessable (≥ 128-bit random, URL-safe)
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  spaceId: uuid("space_id").references(() => spaces.id), // optional per-project narrowing
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
