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
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { treeNodes } from "../knowledge/schema";
import { projectPeople } from "../person/schema";
import { projects } from "../project/schema";
import { sources } from "../storage/schema";

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "restrict" }),
    title: text("title").notNull(),
    activityType: text("activity_type"),
    summary: text("summary"),
    status: text("status", { enum: ["planned", "active", "completed", "cancelled"] })
      .notNull()
      .default("planned"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    check("activities_title_nonempty", sql`btrim(${table.title}) <> ''`),
    check(
      "activities_type_short",
      sql`${table.activityType} IS NULL OR (btrim(${table.activityType}) <> '' AND char_length(${table.activityType}) <= 80)`,
    ),
    check(
      "activities_status_check",
      sql`${table.status} IN ('planned', 'active', 'completed', 'cancelled')`,
    ),
    check("activities_version_positive", sql`${table.version} > 0`),
    unique("activities_id_project_id_key").on(table.id, table.projectId),
    index("activities_project_status_idx").on(table.projectId, table.status),
  ],
);

export const activityPeople = pgTable(
  "activity_people",
  {
    activityId: uuid("activity_id").notNull(),
    projectId: uuid("project_id").notNull(),
    personId: uuid("person_id").notNull(),
    roleLabel: text("role_label"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.activityId, table.personId] }),
    foreignKey({
      columns: [table.activityId, table.projectId],
      foreignColumns: [activities.id, activities.projectId],
      name: "activity_people_activity_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.projectId, table.personId],
      foreignColumns: [projectPeople.projectId, projectPeople.personId],
      name: "activity_people_project_person_fk",
    }).onDelete("restrict"),
    check(
      "activity_people_role_label_short",
      sql`${table.roleLabel} IS NULL OR (btrim(${table.roleLabel}) <> '' AND char_length(${table.roleLabel}) <= 80)`,
    ),
    index("activity_people_person_id_idx").on(table.personId),
  ],
);

export const activityMaterials = pgTable(
  "activity_materials",
  {
    activityId: uuid("activity_id").notNull(),
    projectId: uuid("project_id").notNull(),
    sourceId: uuid("source_id").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.activityId, table.sourceId] }),
    foreignKey({
      columns: [table.activityId, table.projectId],
      foreignColumns: [activities.id, activities.projectId],
      name: "activity_materials_activity_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.sourceId, table.projectId],
      foreignColumns: [sources.id, sources.spaceId],
      name: "activity_materials_source_project_fk",
    }).onDelete("restrict"),
    index("activity_materials_source_id_idx").on(table.sourceId),
  ],
);

export const activityNotes = pgTable(
  "activity_notes",
  {
    activityId: uuid("activity_id").notNull(),
    projectId: uuid("project_id").notNull(),
    nodeId: uuid("node_id").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.activityId, table.nodeId] }),
    foreignKey({
      columns: [table.activityId, table.projectId],
      foreignColumns: [activities.id, activities.projectId],
      name: "activity_notes_activity_project_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.nodeId, table.projectId],
      foreignColumns: [treeNodes.id, treeNodes.projectId],
      name: "activity_notes_node_project_fk",
    }).onDelete("restrict"),
    index("activity_notes_node_id_idx").on(table.nodeId),
  ],
);

export type ActivityStatus = (typeof activities.$inferSelect)["status"];
