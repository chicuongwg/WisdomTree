import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Cross-cutting: durable worker job state (database-schema.md § jobs).
// Redis carries the wake-up signal; Postgres carries the durable state, so
// the operating playbook can list, retry, and replay jobs after an outage.

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: text("job_type").notNull(), // extraction, render, reindex, drive_import, sheet_import, forms_poll, embedding (1.5)
  payload: jsonb("payload").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(), // e.g. extract:{source_version_id}
  state: text("state", { enum: ["queued", "running", "succeeded", "failed", "dead"] }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
