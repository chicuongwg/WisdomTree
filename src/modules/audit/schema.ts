import { bigint, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../auth/schema";

// Module: audit — cross-cutting actor/action/target/outcome records, written
// in the same transaction as the mutation (database-schema.md § audit_events).
// Append-only: enforced by trigger in the migration.

export const auditEvents = pgTable("audit_events", {
  id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  actorRole: text("actor_role").notNull(),
  accountability: text("accountability", {
    enum: ["uploader", "editor_updater", "approver_publisher", "operator", "member"],
  }).notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  outcome: text("outcome", { enum: ["success", "denied", "failed"] }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
