import {
  bigint,
  integer,
  jsonb,
  pgTable,
  pgView,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "../auth/schema";

// Module: storage — spaces, membership, sources, versions, raw text.
// Column definitions transcribed from docs/design/database-schema.md.
// Generated tsvector columns (text_chunks.tsv) live only in the SQL migration;
// they are queried through raw SQL, never mapped here.

export const spaces = pgTable("spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type", { enum: ["team", "personal"] }).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const spaceMembers = pgTable(
  "space_members",
  {
    spaceId: uuid("space_id").notNull().references(() => spaces.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    addedBy: uuid("added_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.spaceId, t.userId] })],
);

// Folders inside a space. NULL parent = the space root; NULL sources.folder_id
// likewise. drizzle/0003 carries the uniqueness rules (name unique per parent,
// with a partial index for the root because NULLs compare distinct).
export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id),
  folderId: uuid("folder_id").references(() => folders.id),
  title: text("title").notNull(),
  description: text("description"),
  trustStatus: text("trust_status", {
    enum: ["unknown", "candidate", "trusted", "rejected", "archived"],
  })
    .notNull()
    .default("unknown"),
  submittedBy: uuid("submitted_by").notNull().references(() => users.id),
  assignedTo: uuid("assigned_to").references(() => users.id),
  currentVersionId: uuid("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const sourceVersions = pgTable(
  "source_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").notNull().references(() => sources.id),
    seq: integer("seq").notNull(),
    originalObjectKey: text("original_object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    storageState: text("storage_state", {
      enum: ["uploaded", "stored", "quarantined", "archived"],
    })
      .notNull()
      .default("uploaded"),
    extractionStatus: text("extraction_status", {
      enum: ["pending", "processed", "unprocessable"],
    })
      .notNull()
      .default("pending"),
    extractionMeta: jsonb("extraction_meta"),
    previewObjectKeys: jsonb("preview_object_keys"),
    uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
    storedAt: timestamp("stored_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (t) => [unique().on(t.sourceId, t.seq)],
);

export const textChunks = pgTable(
  "text_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceVersionId: uuid("source_version_id").notNull().references(() => sourceVersions.id),
    position: integer("position").notNull(),
    refType: text("ref_type", { enum: ["page", "paragraph"] }).notNull(),
    refLabel: text("ref_label").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sourceVersionId, t.position)],
);

// Each save appends a new row (the corrected text version chain); the latest
// seq is current. No updates, so no version column.
export const correctedTexts = pgTable(
  "corrected_texts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceVersionId: uuid("source_version_id").notNull().references(() => sourceVersions.id),
    seq: integer("seq").notNull(),
    content: text("content").notNull(),
    editedBy: uuid("edited_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sourceVersionId, t.seq)],
);

// Curation is an optional overlay on storage; a stored item with no row here
// is simply "stored, never nominated".
export const curations = pgTable("curations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceVersionId: uuid("source_version_id").notNull().unique().references(() => sourceVersions.id),
  state: text("state", {
    enum: ["under_correction", "ready_for_review", "promoted", "rejected"],
  }).notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  nominatedBy: uuid("nominated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const markdownDrafts = pgTable("markdown_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceVersionId: uuid("source_version_id").notNull().unique().references(() => sourceVersions.id),
  contentMd: text("content_md").notNull(),
  // FK to branches lives in the migration; mapped plain here to avoid a
  // storage ↔ knowledge module import cycle (same pattern as currentVersionId).
  suggestedBranchId: uuid("suggested_branch_id"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const branchGapRequests = pgTable("branch_gap_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  state: text("state", {
    enum: ["submitted", "triaged", "converted_to_branch", "rejected", "archived"],
  })
    .notNull()
    .default("submitted"),
  submittedBy: uuid("submitted_by").notNull().references(() => users.id),
  triagedBy: uuid("triaged_by").references(() => users.id),
  convertedBranchId: uuid("converted_branch_id"),
  convertedNodeId: uuid("converted_node_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

// SQL view defined in the migration; mapped read-only for My Submissions / Source Intake.
export const intakeItems = pgView("intake_items", {
  submissionId: uuid("submission_id"),
  itemType: text("item_type"),
  title: text("title"),
  state: text("state"),
  submittedBy: uuid("submitted_by"),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
}).existing();
