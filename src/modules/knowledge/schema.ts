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

// Module: knowledge — branches, tree nodes, versions, links, tags, promotions,
// review queue, and conflicts (module-map.md).
// Column definitions transcribed from docs/design/database-schema.md.
// Generated tsvector columns (tree_nodes.tsv), the publish/canonical CHECKs,
// and the append-only triggers (tree_node_versions, promotions) live only in
// the SQL migration.

export const vaults = pgTable("vaults", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: ["personal", "shared"] }).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  name: text("name").notNull(),
  gitRepoKey: text("git_repo_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vaultGrants = pgTable(
  "vault_grants",
  {
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => vaults.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    grant: text("grant_name", { enum: ["owner", "editor", "reviewer", "viewer"] }).notNull(),
    grantedBy: uuid("granted_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.vaultId, t.userId] })],
);

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id),
  parentId: uuid("parent_id"),
  name: text("name").notNull().unique(),
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
});

export const treeNodes = pgTable("tree_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(), // stable export/publish path
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
});

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.nodeId, t.seq)],
);

export const vaultGitJobs = pgTable("vault_git_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  vaultId: uuid("vault_id")
    .notNull()
    .references(() => vaults.id),
  nodeVersionId: uuid("node_version_id")
    .notNull()
    .unique()
    .references(() => treeNodeVersions.id),
  state: text("state", { enum: ["pending", "running", "done", "failed"] })
    .notNull()
    .default("pending"),
  attempts: integer("attempts").notNull().default(0),
  commitSha: text("commit_sha"),
  lastError: text("last_error"),
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

export const reviewTasks = pgTable("review_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskType: text("task_type", {
    enum: ["correction", "gap_triage", "publish", "merge", "archive", "operational"],
  }).notNull(),
  targetType: text("target_type", {
    enum: ["source_version", "branch_gap_request", "markdown_draft", "tree_node", "conflict"],
  }).notNull(),
  targetId: uuid("target_id").notNull(),
  state: text("state", {
    enum: ["queued", "assigned", "in_review", "changes_requested", "approved", "rejected"],
  }).notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const conflicts = pgTable("conflicts", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetType: text("target_type", {
    enum: ["tree_node", "corrected_text", "markdown_draft", "branch"],
  }).notNull(),
  targetId: uuid("target_id").notNull(),
  state: text("state", {
    enum: ["detected", "locked", "resolving", "resolved", "archived_conflict"],
  }).notNull(),
  baseVersion: integer("base_version").notNull(), // the version the losing save targeted
  attemptedPayload: jsonb("attempted_payload").notNull(), // the rejected save, preserved
  attemptedBy: uuid("attempted_by")
    .notNull()
    .references(() => users.id),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolution: jsonb("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});
