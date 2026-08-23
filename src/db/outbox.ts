import { bigint, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Cross-cutting transactional outbox:
// written in the same transaction as the mutation; the demo dispatcher is a
// stub that only marks rows dispatched.

export const outboxEvents = pgTable("outbox_events", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
});
