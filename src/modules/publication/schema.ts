import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { treeNodes, treeNodeVersions } from "../knowledge/schema";

export const notePublicRevisions = pgTable(
  "note_public_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => treeNodes.id, { onDelete: "restrict" }),
    revisionNumber: integer("revision_number").notNull(),
    sourceNoteVersionId: uuid("source_note_version_id")
      .notNull()
      .references(() => treeNodeVersions.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    summary: text("summary"),
    contentMd: text("content_md").notNull(),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("note_public_revisions_note_revision_key").on(t.noteId, t.revisionNumber),
    unique("note_public_revisions_note_source_key").on(t.noteId, t.sourceNoteVersionId),
    unique("note_public_revisions_note_id_id_key").on(t.noteId, t.id),
    index("note_public_revisions_source_version_idx").on(t.sourceNoteVersionId),
  ],
);

export const notePublications = pgTable(
  "note_publications",
  {
    noteId: uuid("note_id")
      .primaryKey()
      .references(() => treeNodes.id, { onDelete: "restrict" }),
    publicSlug: text("public_slug").notNull().unique(),
    currentRevisionId: uuid("current_revision_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    unpublishedAt: timestamp("unpublished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    foreignKey({
      name: "note_publications_current_revision_fk",
      columns: [t.noteId, t.currentRevisionId],
      foreignColumns: [notePublicRevisions.noteId, notePublicRevisions.id],
    }).onDelete("restrict"),
    unique("note_publications_note_slug_key").on(t.noteId, t.publicSlug),
    index("note_publications_current_revision_idx").on(t.currentRevisionId),
    sql`CHECK (${t.version} > 0)`,
  ],
);
