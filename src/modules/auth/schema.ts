import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Module: auth — owns role assignment and session state (module-map.md).
// Column definitions transcribed from docs/design/database-schema.md § users.

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["user", "editor", "admin_op"] }).notNull(),
  zaloUserId: text("zalo_user_id"),
  locale: text("locale").notNull().default("vi"),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export type Role = (typeof users.$inferSelect)["role"];
