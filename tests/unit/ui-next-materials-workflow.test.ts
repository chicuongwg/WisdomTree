import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";

const root = "src/app";

export async function run() {
  const deliveryFiles = [
    `${root}/api/app/projects/[projectId]/materials/route.ts`,
    `${root}/api/app/projects/[projectId]/materials/[materialId]/versions/route.ts`,
    `${root}/api/app/projects/[projectId]/materials/[materialId]/versions/[versionId]/candidate/route.ts`,
    `${root}/api/app/projects/[projectId]/materials/[materialId]/versions/[versionId]/extract/route.ts`,
    `${root}/api/app/projects/[projectId]/materials/[materialId]/versions/[versionId]/note/route.ts`,
  ];
  for (const file of deliveryFiles) {
    assert.equal(existsSync(file), true, `missing delivery route ${file}`);
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /@\/db|drizzle-orm/, `${file} bypasses the application boundary`);
  }

  const materialsPage = readFileSync(`${root}/app/projects/[projectId]/materials/page.tsx`, "utf8");
  assert.match(materialsPage, /listAppProjectMaterials/);
  assert.doesNotMatch(materialsPage, /ProjectModulePlaceholder/);

  const detail = readFileSync(
    `${root}/app/projects/[projectId]/materials/_components/material-detail.tsx`,
    "utf8",
  );
  assert.match(detail, /materials\.extraction\.derivedNotice/);
  assert.match(detail, /createProjectNote/);
  assert.doesNotMatch(detail, /spaceId|branchId|Personal|Team/);

  const candidateRoute = readFileSync(deliveryFiles[2], "utf8");
  assert.match(candidateRoute, /getAppProjectMaterialCandidateForReview/);
  const noteRoute = readFileSync(deliveryFiles[4], "utf8");
  assert.match(noteRoute, /evolveAppProjectMaterialCandidateIntoNote/);

  const immutableMigration = readFileSync(
    "drizzle/0049_source_version_original_immutable.sql",
    "utf8",
  );
  assert.match(immutableMigration, /source_versions_preserve_original/);
  assert.match(immutableMigration, /original_object_key/);
  assert.match(immutableMigration, /checksum_sha256/);
  assert.doesNotMatch(immutableMigration, /DELETE FROM|UPDATE source_versions SET/);

  for (const key of [
    "materials.title",
    "materials.new",
    "materials.extraction.derivedNotice",
    "materials.createProjectNote",
    "materials.lineage.title",
  ] as const) {
    assert.ok(key in viMessages, `missing Vietnamese Material key ${key}`);
    assert.ok(key in enMessages, `missing English Material key ${key}`);
  }
}
