import { asc, isNull } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { outboxEvents } from "@/db/outbox";
import { notifications } from "./schema";

// Demo dispatcher stub (demo-brief.md: "dispatcher may be a stub that only
// marks dispatched"). It drains undispatched outbox rows in id order; loan
// events additionally produce in-app notification records for the affected
// member, and the V1 email/zalo channels just log to console.

const NOTIFY_EVENTS: Record<string, (payload: Record<string, unknown>) => { userId: string } | null> = {
  "loan.approved": (p) => (typeof p.borrowerId === "string" ? { userId: p.borrowerId } : null),
  "loan.borrowed": (p) => (typeof p.borrowerId === "string" ? { userId: p.borrowerId } : null),
  "loan.returned": (p) => (typeof p.borrowerId === "string" ? { userId: p.borrowerId } : null),
  "loan.declined": (p) => (typeof p.borrowerId === "string" ? { userId: p.borrowerId } : null),
  // Knowledge module (docs/system/notifications.md matrix):
  // published node → uploader (in-app); assignment → assigned editor (in-app).
  "tree.node.published": (p) => (typeof p.uploaderId === "string" ? { userId: p.uploaderId } : null),
  "source.assigned": (p) => (typeof p.assigneeId === "string" ? { userId: p.assigneeId } : null),
};

export async function dispatchOutbox(): Promise<void> {
  const pending = await db
    .select()
    .from(outboxEvents)
    .where(isNull(outboxEvents.dispatchedAt))
    .orderBy(asc(outboxEvents.id));

  for (const event of pending) {
    const payload = event.payload as Record<string, unknown>;
    const target = NOTIFY_EVENTS[event.eventType]?.(payload);
    if (target) {
      await db.insert(notifications).values({
        userId: target.userId,
        eventType: event.eventType,
        payload,
      });
      console.log(`[notify-stub] email/zalo channels skipped in demo: ${event.eventType} → ${target.userId}`);
    }
    await db
      .update(outboxEvents)
      .set({ dispatchedAt: new Date() })
      .where(eq(outboxEvents.id, event.id));
  }
}
