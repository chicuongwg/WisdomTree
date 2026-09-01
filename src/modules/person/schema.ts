import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { projects } from "../project/schema";

// Canonical TMKT research identity. Authentication and Project access remain
// owned by User and Space membership; neither is implied by these tables.
export const persons = pgTable(
  "persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: text("display_name").notNull(),
    summary: text("summary"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    check("persons_display_name_nonempty", sql`btrim(${table.displayName}) <> ''`),
    check("persons_version_positive", sql`${table.version} > 0`),
    index("persons_display_name_idx").on(table.displayName),
  ],
);

export const personUserLinks = pgTable(
  "person_user_links",
  {
    personId: uuid("person_id")
      .primaryKey()
      .references(() => persons.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    linkedBy: uuid("linked_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("person_user_links_user_id_key").on(table.userId)],
);

export const projectPeople = pgTable(
  "project_people",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "restrict" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.personId] }),
    index("project_people_person_id_idx").on(table.personId),
  ],
);
