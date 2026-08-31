import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "../auth/schema";
import { spaces } from "../storage/schema";
import type { ExportFile } from "./target";

export const wikiReleases = pgTable(
  "wiki_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id),
    releaseNo: integer("release_no").notNull(),
    status: text("status", { enum: ["building", "released", "failed"] })
      .notNull()
      .default("building"),
    snapshot: jsonb("snapshot").$type<ExportFile[]>().notNull().default([]),
    manifestSha256: text("manifest_sha256"),
    commitSha: text("commit_sha"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.spaceId, table.releaseNo)],
);
