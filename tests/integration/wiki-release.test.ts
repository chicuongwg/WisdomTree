import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import {
  createSpaceRelease,
  listSpaceReleases,
  rebuildSpaceRelease,
  verifySpaceRelease,
} from "@/modules/export/service";
import { wikiReleases } from "@/modules/export/schema";
import { treeNodes } from "@/modules/knowledge/schema";
import { spaces } from "@/modules/storage/schema";
import { principalFor } from "../setup";

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const outside = await principalFor("lan@wisdomtree.local");
  const [space] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Kho Dự Án Cộng Đồng"))
    .limit(1);
  assert.ok(space);
  await db
    .update(treeNodes)
    .set({ verification: "verified", publish: true })
    .where(eq(treeNodes.title, "Ghi chép các cuộc họp cộng đồng"));
  await assert.rejects(
    listSpaceReleases(outside, space.id),
    (error: unknown) => error instanceof ApiError && error.status === 404,
  );

  const directory = await mkdtemp(path.join(tmpdir(), "wt-release-test-"));
  const previous = process.env.VAULT_GIT_DIR;
  process.env.VAULT_GIT_DIR = directory;
  try {
    const release = await createSpaceRelease(admin, space.id);
    assert.equal(release.status, "released");
    assert.ok(release.commitSha);
    assert.ok(release.fileCount >= 3);
    assert.equal((await verifySpaceRelease(admin, release.id)).valid, true);
    assert.equal((await rebuildSpaceRelease(admin, release.id)).valid, true);
    assert.equal((await listSpaceReleases(admin, space.id))[0].id, release.id);

    await assert.rejects(
      db.update(wikiReleases).set({ status: "failed" }).where(eq(wikiReleases.id, release.id)),
      (error: unknown) =>
        error instanceof Error &&
        ((error as Error & { cause?: Error }).cause?.message.includes("immutable") ?? false),
    );
  } finally {
    if (previous === undefined) delete process.env.VAULT_GIT_DIR;
    else process.env.VAULT_GIT_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
