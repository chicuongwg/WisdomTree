import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { treeNodes } from "../knowledge/schema";

// Module: export — Quartz export job state; export reads, never writes, the
// tree tables. Column definitions transcribed from docs/design/database-schema.md.

export const exportJobs = pgTable("export_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: text("scope", { enum: ["full_tree", "node"] }).notNull(),
  nodeId: uuid("node_id").references(() => treeNodes.id),
  state: text("state", { enum: ["queued", "running", "succeeded", "failed"] }).notNull(),
  triggeredBy: uuid("triggered_by")
    .notNull()
    .references(() => users.id),
  manifest: jsonb("manifest"), // exported slugs and commit SHA
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
