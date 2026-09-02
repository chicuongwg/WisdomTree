import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getTableColumns } from "drizzle-orm";
import {
  noteVersionSupportNoteVersions,
  noteVersionSupportSourceVersions,
  treeNodeVersions,
} from "@/modules/knowledge/schema";

const read = (path: string) => readFileSync(path, "utf8");

export async function run() {
  assert.equal(
    getTableColumns(treeNodeVersions).supportSnapshotComplete.name,
    "support_snapshot_complete",
  );
  assert.equal(
    getTableColumns(noteVersionSupportSourceVersions).targetNoteVersionId.name,
    "target_note_version_id",
  );
  assert.equal(
    getTableColumns(noteVersionSupportNoteVersions).supportingNoteVersionId.name,
    "supporting_note_version_id",
  );

  const migration = read("drizzle/0048_note_version_support.sql");
  assert.match(migration, /WHERE note\.project_id IS NOT NULL/g);
  assert.match(migration, /support_snapshot_complete = true/);
  assert.match(migration, /Note version support snapshots are append-only/);
  assert.doesNotMatch(migration, /UPDATE tree_nodes|INSERT INTO tree_nodes/);

  const support = read("src/modules/knowledge/support.ts");
  assert.match(support, /export async function snapshotNoteVersionSupport/);
  assert.match(support, /export async function listNoteVersionSupportingResearch/);
  assert.match(support, /historical_support_unavailable/);

  const writerSources = [
    read("src/modules/knowledge/drafts.ts"),
    read("src/modules/knowledge/service-mutations.ts"),
    read("src/modules/knowledge/publication.ts"),
    read("src/modules/storage/candidates.ts"),
  ].join("\n");
  const versionWrites = writerSources.match(/\.insert\(treeNodeVersions\)/g) ?? [];
  const snapshots = writerSources.match(/snapshotNoteVersionSupport\(/g) ?? [];
  assert.equal(versionWrites.length, 6);
  assert.equal(snapshots.length, 6);
}
