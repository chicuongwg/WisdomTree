import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../auth/schema";

// Module: bridge-google — Drive/Sheets/Forms import configuration and the
// per-item idempotency ledger (docs/system/google-bridge.md).
// Column definitions transcribed from docs/design/database-schema.md.

export const bridgeImports = pgTable("bridge_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: ["drive", "sheet_catalog", "sheet_metrics", "forms"] }).notNull(),
  config: jsonb("config").notNull(), // folder/sheet id, target space, column mapping
  state: text("state", { enum: ["configured", "running", "succeeded", "failed"] }).notNull(),
  watermark: text("watermark"), // last ingested row/timestamp for Forms polling
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastReport: jsonb("last_report"), // created/skipped/failed row report
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

// Idempotency: re-running an import skips any external_id already present.
export const bridgeImportItems = pgTable(
  "bridge_import_items",
  {
    importId: uuid("import_id")
      .notNull()
      .references(() => bridgeImports.id),
    externalId: text("external_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    status: text("status", { enum: ["created", "skipped", "failed"] }).notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.importId, t.externalId] })],
);
