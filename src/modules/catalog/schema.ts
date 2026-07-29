import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { sources, spaces } from "../storage/schema";

// Module: catalog — physical library inventory (module-map.md).
// Column definitions transcribed from docs/design/database-schema.md § catalog_items.

export const catalogItems = pgTable("catalog_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemCode: text("item_code").notNull().unique(), // format LIB-000001
  title: text("title").notNull(),
  author: text("author"),
  coverPhotoKey: text("cover_photo_key"),
  location: text("location"),
  /** How many physical books sit under this item code. Never below 1. */
  copies: integer("copies").notNull().default(1),
  status: text("status", { enum: ["available", "borrowed", "lost", "repair"] })
    .notNull()
    .default("available"),
  /** Retired from the shelf list. Set = hidden from every read, kept on record. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => spaces.id),
  linkedSourceId: uuid("linked_source_id").references(() => sources.id),
  importId: uuid("import_id"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});
