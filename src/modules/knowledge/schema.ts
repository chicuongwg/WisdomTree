import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { sourceVersions, spaces } from "../storage/schema";

// Module: knowledge — branches, tree nodes, versions, links, tags,
// proposals and promotions.
// Generated tsvector columns (tree_nodes.tsv), the publish/canonical CHECKs,
// and the append-only triggers (tree_node_versions, promotions) live only in
// the SQL migration.

export const branches = pgTable(
  "branches",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").references((): AnyPgColumn => branches.id),
  // A shared branch belongs to exactly one team space. Personal branches have
  // no space: ownerUserId remains their complete visibility boundary.
  spaceId: uuid("space_id").references(() => spaces.id),
  // Uniqueness is scoped by the partial indexes below: team names per space,
  // personal names per owner — two people may both hold "Ghi chú".
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  // scope: 'team' = shared project knowledge (all members); 'personal' = private
  // note tree visible only to ownerUserId. Defaults to 'team' so all existing
  // rows stay valid after the 0010 migration.
  scope: text("scope", { enum: ["team", "personal"] })
    .notNull()
    .default("team"),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
  },
  (t) => [
    uniqueIndex("branches_team_space_name_key")
      .on(t.spaceId, t.name)
      .where(sql`${t.scope} = 'team'`),
    uniqueIndex("branches_personal_owner_name_key")
      .on(t.ownerUserId, t.name)
      .where(sql`${t.scope} = 'personal'`),
  ],
);

export const treeNodes = pgTable(
  "tree_nodes",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  title: text("title").notNull(),
  summary: text("summary"),
  sortOrder: integer("sort_order").notNull().default(0),
  // Stable export/publish path, unique per branch (the export path is
  // branch-slug/node-slug, so per-branch uniqueness keeps paths unique).
  slug: text("slug").notNull(),
  contentMd: text("content_md").notNull(),
  verification: text("verification", {
    enum: ["no_source", "unverified", "verified", "archived"],
  }).notNull(),
  // May be true only when verification = 'verified' (CHECK in migration).
  publish: boolean("publish").notNull().default(false),
  // Merge redirect target; non-null implies verification = 'archived' (CHECK).
  canonicalNodeId: uuid("canonical_node_id"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
  },
  (t) => [unique().on(t.branchId, t.slug)],
);

export const treeNodeVersions = pgTable(
  "tree_node_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => treeNodes.id),
    seq: integer("seq").notNull(),
    contentMd: text("content_md").notNull(),
    verification: text("verification").notNull(), // verification at snapshot time
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    changeSummary: text("change_summary"),
    reviewStatus: text("review_status", {
      enum: ["legacy_accepted", "pending", "approved"],
    })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.nodeId, t.seq)],
);

// The ONE proposal table of the review boundary. kind='change' proposes an
// edit to an existing promoted node (node_id = that node); kind='publication'
// proposes promoting a personal node onto a team branch (node_id = the
// personal source node, target_branch_id = where it lands — CHECK in the
// migration ties target_branch_id to the publication kind).
export const nodeProposals = pgTable("node_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: ["change", "publication"] }).notNull(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => treeNodes.id),
  /** The node's version the snapshot was taken from. */
  baseVersion: integer("base_version").notNull(),
  sourceVersionId: uuid("source_version_id").references(() => sourceVersions.id),
  targetBranchId: uuid("target_branch_id").references(() => branches.id),
  title: text("title").notNull(),
  summary: text("summary"),
  sortOrder: integer("sort_order").notNull().default(0),
  contentMd: text("content_md").notNull(),
  tags: jsonb("tags").notNull().default([]),
  links: jsonb("links").notNull().default([]),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  state: text("state", {
    enum: ["pending", "approved", "rejected", "changes_requested"],
  })
    .notNull()
    .default("pending"),
  decisionNote: text("decision_note"),
  decidedBy: uuid("decided_by").references(() => users.id),
  approvedNodeVersionId: uuid("approved_node_version_id").references(() => treeNodeVersions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nodeTranslations = pgTable(
  "node_translations",
  {
    nodeId: uuid("node_id").notNull().references(() => treeNodes.id),
    locale: text("locale", { enum: ["en"] }).notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentMd: text("content_md").notNull(),
    slug: text("slug").notNull(),
    version: integer("version").notNull().default(1),
    updatedBy: uuid("updated_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.nodeId, table.locale] })],
);

export const nodeTranslationVersions = pgTable(
  "node_translation_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nodeId: uuid("node_id").notNull(),
    locale: text("locale", { enum: ["en"] }).notNull(),
    seq: integer("seq").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    contentMd: text("content_md").notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    reviewStatus: text("review_status", { enum: ["pending", "approved"] }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.nodeId, table.locale, table.seq)],
);

export const nodeTranslationProposals = pgTable("node_translation_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id").notNull().references(() => treeNodes.id),
  locale: text("locale", { enum: ["en"] }).notNull(),
  baseVersion: integer("base_version").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  contentMd: text("content_md").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  state: text("state", { enum: ["pending", "approved", "rejected", "changes_requested"] }).notNull().default("pending"),
  decisionNote: text("decision_note"),
  decidedBy: uuid("decided_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


export const nodeLinks = pgTable(
  "node_links",
  {
    fromNodeId: uuid("from_node_id")
      .notNull()
      .references(() => treeNodes.id),
    toNodeId: uuid("to_node_id")
      .notNull()
      .references(() => treeNodes.id),
    linkType: text("link_type", {
      enum: ["related", "supports", "contrasts", "part_of"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fromNodeId, t.toNodeId, t.linkType] })],
);

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nodeTags = pgTable(
  "node_tags",
  {
    nodeId: uuid("node_id")
      .notNull()
      .references(() => treeNodes.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.tagId] })],
);

// Provenance backbone: evidence-to-publication linkage (append-only).
export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceVersionId: uuid("source_version_id")
    .notNull()
    .references(() => sourceVersions.id),
  nodeVersionId: uuid("node_version_id")
    .notNull()
    .references(() => treeNodeVersions.id),
  approvedBy: uuid("approved_by")
    .notNull()
    .references(() => users.id),
  excerptChunkIds: uuid("excerpt_chunk_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});


// Single-writer editing: one row per node while its editor is open. The
// session key (not just the user) is the holder, so the same person in a
// second browser is a different holder; a stale heartbeat frees the lock.
export const nodeEditLocks = pgTable("node_edit_locks", {
  nodeId: uuid("node_id")
    .primaryKey()
    .references(() => treeNodes.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  sessionKey: text("session_key").notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).notNull().defaultNow(),
});
