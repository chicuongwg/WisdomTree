import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { spaceMembers, spaces } from "../storage/schema";

// Module: project — confirmed TMKT projects. A row extends one team space and
// deliberately shares its id; team spaces without a row remain legacy shared
// spaces during migration.

export const projects = pgTable(
  "projects",
  {
    projectId: uuid("project_id")
      .primaryKey()
      .references(() => spaces.id, { onDelete: "restrict" }),
    researchLens: text("research_lens").notNull(),
    description: text("description"),
    status: text("status", { enum: ["active", "paused", "completed", "archived"] })
      .notNull()
      .default("active"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    check("projects_research_lens_nonempty", sql`btrim(${table.researchLens}) <> ''`),
    check(
      "projects_status_check",
      sql`${table.status} IN ('active', 'paused', 'completed', 'archived')`,
    ),
    check("projects_version_positive", sql`${table.version} > 0`),
    index("projects_status_idx").on(table.status),
  ],
);

export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export const projectCapabilities = pgTable(
  "project_capabilities",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "restrict" }),
    capability: text("capability", { enum: ["library_circulation"] }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.capability] }),
    check(
      "project_capabilities_capability_check",
      sql`${table.capability} IN ('library_circulation')`,
    ),
  ],
);

export const projectLibraryOperators = pgTable(
  "project_library_operators",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull(),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    foreignKey({
      columns: [table.projectId, table.userId],
      foreignColumns: [spaceMembers.spaceId, spaceMembers.userId],
      name: "project_library_operators_membership_fk",
    }).onDelete("cascade"),
    index("project_library_operators_user_id_idx").on(table.userId),
  ],
);

export type ProjectCapability = "library_circulation";
