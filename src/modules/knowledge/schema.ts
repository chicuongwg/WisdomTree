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
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { sourceVersions } from "../storage/schema";

// Module: knowledge — vaults, branches, tree nodes, versions, links, tags,
// proposals and promotions.
// Generated tsvector columns (tree_nodes.tsv), the publish/canonical CHECKs,
// and the append-only triggers (tree_node_versions, promotions) live only in
// the SQL migration.

export const vaults = pgTable("vaults", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: ["personal", "shared"] }).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable(
  "branches",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id),
  parentId: uuid("parent_id"),
  // Unique per vault: two people's personal vaults may both hold "Ghi chú".
  name: text("name").notNull(),
  description: text("description"),
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
  (t) => [unique().on(t.vaultId, t.name)],
);

export const treeNodes = pgTable(
  "tree_nodes",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  title: text("title").notNull(),
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

export const nodeChangeProposals = pgTable("node_change_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id")
    .notNull()
    .references(() => treeNodes.id),
  baseVersion: integer("base_version").notNull(),
  title: text("title").notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nodePublicationProposals = pgTable("node_publication_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceNodeId: uuid("source_node_id")
    .notNull()
    .references(() => treeNodes.id),
  sourceNodeVersion: integer("source_node_version").notNull(),
  sourceVersionId: uuid("source_version_id").references(() => sourceVersions.id),
  targetBranchId: uuid("target_branch_id")
    .notNull()
    .references(() => branches.id),
  title: text("title").notNull(),
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
