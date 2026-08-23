import { and, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { sources } from "../storage/schema";
import { spaceMembers } from "../storage/schema";
import { deadlines } from "../pm/schema";
import { notificationPreferences, notifications } from "./schema";

// Notification fan-out, written directly inside the mutation's transaction —
// one process, one consumer, so the notification is exactly as durable as the
// mutation that caused it. notifyEvent resolves recipients from the event
// matrix, consults per-user channel preferences (absent row = default matrix),
// and writes the notifications row — which IS delivery for the one channel
// that exists, the in-app center. A second channel, when someone asks for
// one, brings its own delivery bookkeeping. The one time-driven producer is
// the deadline-reminder check, run by the cron route.

export type Channel = "in_app";

// The notified events. One channel — the in-app center; per-event opt-out
// lives in notification_preferences.
export const NOTIFIED_EVENTS: ReadonlySet<string> = new Set([
  "source.processing_failed",
  "tree.node.published",
  "loan.approved",
  "loan.borrowed",
  "loan.returned",
  "loan.declined",
  "loan.overdue",
  "loan.requested",
  "deadline.approaching",
  "comment.created",
]);

type Payload = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Matrix recipient resolution; may hit the DB for member fan-out. */
async function resolveRecipients(tx: Tx, eventType: string, payload: Payload): Promise<string[]> {
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
    case "source.processing_failed": {
      // Payload carries only sourceId; the uploader is the source submitter.
      const sourceId = str(payload.sourceId);
      if (!sourceId) return [];
      const [row] = await tx
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
      const members = await tx
        .select({ userId: spaceMembers.userId })
        .from(spaceMembers)
        .where(eq(spaceMembers.spaceId, spaceId));
      return members.map((m) => m.userId);
    }
    default:
      return []; // events outside the matrix notify nobody
  }
}

/** Per-event opt-out: a preference row without "in_app" silences the event. */
async function channelsFor(tx: Tx, userId: string, eventType: string): Promise<Channel[]> {
  const [pref] = await tx
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, eventType),
      ),
    );
  if (pref) return (pref.channels as string[]).includes("in_app") ? ["in_app"] : [];
  return NOTIFIED_EVENTS.has(eventType) ? ["in_app"] : [];
}

/**
 * Fan an event out to notifications inside the caller's transaction: the
 * notifications row is the durable in-app-center record, and it commits
 * with the mutation.
 */
export async function notifyEvent(tx: Tx, eventType: string, payload: Payload): Promise<void> {
  const recipients = await resolveRecipients(tx, eventType, payload);
  for (const userId of recipients) {
    const channels = await channelsFor(tx, userId, eventType);
    if (channels.length === 0) continue; // opted out: no notification at all
    await tx.insert(notifications).values({ userId, eventType, payload });
  }
}

/**
 * Deadline reminders — the one time-driven notification producer, run by the
 * cron route: for every (deadline, offset) whose window has opened
 * (due_at - offset <= now < due_at) and that has no deadline_reminders row
 * yet, record the sent offset and fan out deadline.approaching — the PK
 * (deadline_id, offset) makes this exactly-once.
 */
export async function checkDeadlineReminders(): Promise<void> {
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
      await notifyEvent(tx, "deadline.approaching", {
        deadlineId: row.id,
        spaceId: row.space_id,
        title: row.title,
        dueAt: new Date(row.due_at).toISOString(),
        offset: row.reminder_offset,
      });
    });
  }
}
