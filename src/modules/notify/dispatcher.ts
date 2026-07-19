import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { outboxEvents } from "@/db/outbox";
import { sources } from "../storage/schema";
import { spaceMembers } from "../storage/schema";
import { users } from "../auth/schema";
import { deadlines } from "../pm/schema";
import { notificationDeliveries, notificationPreferences, notifications } from "./schema";

// The notify dispatcher tick (docs/design/database-schema.md § outbox_events,
// docs/system/notifications.md): it first runs the deadline-reminder check
// (idempotent via deadline_reminders PK (deadline_id, offset)), then drains
// undispatched outbox rows in id order, resolving recipients from the
// event-to-notification matrix, consulting per-user channel preferences
// (absent row = default matrix), and writing notification_deliveries per
// channel. in_app is sent by writing the notifications row; the email and
// zalo V1 adapters console.log the message and mark the delivery sent —
// best-effort and additive, never blocking the triggering workflow.

export type Channel = "in_app" | "email" | "zalo";

// Default matrix, verbatim from docs/system/notifications.md
// § Event-to-Notification Matrix, keyed by concrete outbox event type.
// loan.borrowed/returned/declined ride the "submission state changed →
// in-app, Zalo" default (matrix names only approved/overdue explicitly).
export const DEFAULT_CHANNELS: Record<string, Channel[]> = {
  "source.processing_failed": ["in_app", "zalo"],
  "source.assigned": ["in_app", "email", "zalo"],
  "source.ready_for_review": ["in_app", "email"],
  "tree.node.published": ["in_app"],
  "loan.approved": ["in_app", "zalo"],
  "loan.borrowed": ["in_app", "zalo"],
  "loan.returned": ["in_app", "zalo"],
  "loan.declined": ["in_app", "zalo"],
  "loan.overdue": ["in_app", "zalo", "email"],
  "deadline.approaching": ["in_app", "zalo", "email"],
  "comment.created": ["in_app", "zalo"],
};

type Payload = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Matrix recipient resolution; may hit the DB for member fan-out. */
async function resolveRecipients(eventType: string, payload: Payload): Promise<string[]> {
  switch (eventType) {
    case "loan.approved":
    case "loan.borrowed":
    case "loan.returned":
    case "loan.declined":
    case "loan.overdue": {
      const id = str(payload.borrowerId);
      return id ? [id] : [];
    }
    case "tree.node.published": {
      const id = str(payload.uploaderId);
      return id ? [id] : [];
    }
    case "source.assigned": {
      const id = str(payload.assigneeId);
      return id ? [id] : [];
    }
    case "source.ready_for_review": {
      // Matrix: Admin/Op — every enabled admin_op member.
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin_op"), isNull(users.disabledAt)));
      return admins.map((a) => a.id);
    }
    case "source.processing_failed": {
      // Payload carries only sourceId; the uploader is the source submitter.
      const sourceId = str(payload.sourceId);
      if (!sourceId) return [];
      const [row] = await db
        .select({ submittedBy: sources.submittedBy })
        .from(sources)
        .where(eq(sources.id, sourceId));
      return row ? [row.submittedBy] : [];
    }
    case "comment.created": {
      // Matrix: comment mentioning a member → the mentioned member(s).
      const mentions = Array.isArray(payload.mentions)
        ? payload.mentions.filter((m): m is string => typeof m === "string")
        : [];
      const author = str(payload.authorId);
      return mentions.filter((m) => m !== author);
    }
    case "deadline.approaching": {
      // Matrix: project members = members of the deadline's space.
      const spaceId = str(payload.spaceId);
      if (!spaceId) return [];
      const members = await db
        .select({ userId: spaceMembers.userId })
        .from(spaceMembers)
        .where(eq(spaceMembers.spaceId, spaceId));
      return members.map((m) => m.userId);
    }
    default:
      return []; // events outside the matrix are just marked dispatched
  }
}

async function channelsFor(userId: string, eventType: string): Promise<Channel[]> {
  const [pref] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.eventType, eventType)),
    );
  if (pref) return pref.channels as Channel[];
  return DEFAULT_CHANNELS[eventType] ?? ["in_app"];
}

/**
 * Reminder check inside the dispatcher tick: for every (deadline, offset)
 * whose window has opened (due_at - offset <= now < due_at) and that has no
 * deadline_reminders row yet, record the sent offset and emit
 * deadline.approaching — the PK (deadline_id, offset) makes this exactly-once.
 */
async function checkDeadlineReminders(): Promise<void> {
  const due = await db.execute(sql`
    SELECT d.id, d.space_id, d.title, d.due_at, o.reminder_offset::text AS reminder_offset
    FROM ${deadlines} d
    CROSS JOIN LATERAL unnest(d.reminder_offsets) AS o(reminder_offset)
    WHERE d.due_at - o.reminder_offset <= now()
      AND d.due_at > now()
      AND NOT EXISTS (
        SELECT 1 FROM deadline_reminders r
        WHERE r.deadline_id = d.id AND r."offset" = o.reminder_offset
      )
  `);
  for (const row of due.rows as Array<{
    id: string;
    space_id: string;
    title: string;
    due_at: string | Date;
    reminder_offset: string;
  }>) {
    await db.transaction(async (tx) => {
      // Insert-first dedup: a concurrent tick loses on the PK and skips.
      const inserted = await tx.execute(sql`
        INSERT INTO deadline_reminders (deadline_id, "offset")
        VALUES (${row.id}, ${row.reminder_offset}::interval)
        ON CONFLICT (deadline_id, "offset") DO NOTHING
        RETURNING deadline_id
      `);
      if (inserted.rows.length === 0) return;
      await tx.insert(outboxEvents).values({
        eventType: "deadline.approaching",
        payload: {
          deadlineId: row.id,
          spaceId: row.space_id,
          title: row.title,
          dueAt: new Date(row.due_at).toISOString(),
          offset: row.reminder_offset,
        },
      });
    });
  }
}

export async function dispatchOutbox(): Promise<void> {
  await checkDeadlineReminders();

  const pending = await db
    .select()
    .from(outboxEvents)
    .where(isNull(outboxEvents.dispatchedAt))
    .orderBy(asc(outboxEvents.id));

  for (const event of pending) {
    const payload = event.payload as Payload;
    const recipients = await resolveRecipients(event.eventType, payload);
    for (const userId of recipients) {
      const channels = await channelsFor(userId, event.eventType);
      // The notifications row is the durable in-app-center record; deliveries
      // hang off it per chosen channel. Everything for one recipient commits
      // together with its notification.dispatched event.
      await db.transaction(async (tx) => {
        const [note] = await tx
          .insert(notifications)
          .values({ userId, eventType: event.eventType, payload })
          .returning();
        for (const channel of channels) {
          if (channel === "in_app") {
            // in_app is "sent" the moment the notifications row exists.
            await tx.insert(notificationDeliveries).values({
              notificationId: note.id,
              channel,
              state: "sent",
              attempts: 1,
            });
          } else {
            // V1 email/zalo adapters: console.log the outbound message, then
            // mark sent (integration-contracts.md provider stubs).
            console.log(
              `[notify:${channel}] → user ${userId}: ${event.eventType} ${JSON.stringify(payload)}`,
            );
            await tx.insert(notificationDeliveries).values({
              notificationId: note.id,
              channel,
              state: "sent",
              attempts: 1,
              updatedAt: new Date(),
            });
          }
        }
        await tx.insert(outboxEvents).values({
          eventType: "notification.dispatched",
          payload: { notificationId: note.id, userId, eventType: event.eventType, channels },
        });
      });
    }
    await db
      .update(outboxEvents)
      .set({ dispatchedAt: new Date() })
      .where(eq(outboxEvents.id, event.id));
  }

  // notification.dispatched rows emitted above have no matrix recipients;
  // drain them now so the outbox ends the tick fully dispatched.
  await db
    .update(outboxEvents)
    .set({ dispatchedAt: new Date() })
    .where(and(isNull(outboxEvents.dispatchedAt), eq(outboxEvents.eventType, "notification.dispatched")));
}
