import {
  bigint,
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

// Module: storage — spaces, membership, sources, versions, raw text.
// Generated tsvector columns (text_chunks.tsv) live only in the SQL migration;
// they are queried through raw SQL, never mapped here.

export const spaces = pgTable("spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type", { enum: ["team", "personal"] }).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});

export const spaceMembers = pgTable(
  "space_members",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    addedBy: uuid("added_by")
      .notNull()
      .references(() => users.id),
    memberRole: text("member_role", {
      enum: ["viewer", "contributor", "manager"],
    })
      .notNull()
      .default("contributor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.spaceId, t.userId] })],
);

// Folders inside a space. NULL parent = the space root; NULL sources.folder_id
// likewise. drizzle/0003 carries the uniqueness rules (name unique per parent,
// with a partial index for the root because NULLs compare distinct).
export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => spaces.id),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Flat content taxonomy. "Sách" is seeded; more categories are an INSERT (no
// admin UI until someone needs one).
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => spaces.id),
  folderId: uuid("folder_id").references(() => folders.id),
  categoryId: uuid("category_id").references(() => categories.id),
  title: text("title").notNull(),
  description: text("description"),
  trustStatus: text("trust_status", {
    enum: ["unknown", "candidate", "trusted", "rejected", "archived"],
  })
    .notNull()
    .default("unknown"),
  submittedBy: uuid("submitted_by")
    .notNull()
    .references(() => users.id),
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
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
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
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
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
    sourceVersionId: uuid("source_version_id")
      .notNull()
      .references(() => sourceVersions.id),
    position: integer("position").notNull(),
    refType: text("ref_type", { enum: ["page", "paragraph"] }).notNull(),
    refLabel: text("ref_label").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sourceVersionId, t.position)],
);

export const extractionCandidates = pgTable("extraction_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceVersionId: uuid("source_version_id")
    .notNull()
    .unique()
    .references(() => sourceVersions.id),
  contentMd: text("content_md").notNull(),
  contentSha256: text("content_sha256").notNull(),
  method: text("method", { enum: ["text", "pandoc", "ocr"] }).notNull(),
  state: text("state", { enum: ["pending_review", "evolved", "rejected"] })
    .notNull()
    .default("pending_review"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  evolvedNodeId: uuid("evolved_node_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Physical copy metadata for a Library item — the book-on-a-shelf half of a
// source (the merge of the old catalog_items table). 1:1 with sources; a
// source without a row here is digital-only. Loans (loan_tickets) key on this
// row's id, so the one-active-loan partial unique index survives.
export const sourcePhysical = pgTable("source_physical", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id")
    .notNull()
    .unique()
    .references(() => sources.id),
  itemCode: text("item_code").notNull().unique(), // format LIB-000001
  author: text("author"),
  coverPhotoKey: text("cover_photo_key"),
  location: text("location"),
  /** How many physical books sit under this item code. Never below 1. */
  copies: integer("copies").notNull().default(1),
  status: text("status", { enum: ["available", "borrowed", "lost", "repair"] })
    .notNull()
    .default("available"),
  /** Retired from the shelf. Set = hidden from every read, kept on record. */
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  version: integer("version").notNull().default(1),
});
