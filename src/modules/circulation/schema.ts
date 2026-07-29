import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { catalogItems } from "../catalog/schema";

// Module: circulation — borrow/return workflow; depends on catalog for item
// identity, never the other way around (module-map.md dependency rules).
// Column definitions transcribed from docs/design/database-schema.md § loan_tickets.
// "One active loan per item" is a partial unique index in the SQL migration.

export const loanTickets = pgTable("loan_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => catalogItems.id),
  borrowerId: uuid("borrower_id")
    .notNull()
    .references(() => users.id),
  state: text("state", {
    enum: ["requested", "approved", "declined", "borrowed", "overdue", "returned"],
  })
    .notNull()
    .default("requested"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  borrowedAt: timestamp("borrowed_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  handledBy: uuid("handled_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});
