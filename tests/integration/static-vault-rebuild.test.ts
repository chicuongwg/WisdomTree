import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { users } from "../../src/modules/auth/schema";
import { branches, nodeLinks, nodeTags, tags, treeNodes, treeNodeVersions, vaults } from "../../src/modules/knowledge/schema";
import {
  buildStaticVaultFiles,
  renderMarkdown,
  sha256,
  verifyStaticVaultFiles,
  type StaticVault,
} from "../../src/modules/knowledge/static-vault";
import { applySnapshotInTransaction, assertRebuildable } from "../../scripts/vault-rebuild";

const ROLLBACK = new Error("test rollback");

export async function run() {
  const [creator] = await db.select({ id: users.id }).from(users).limit(1);
  assert.ok(creator, "expected a seeded user");
  const ids = {
    vault: crypto.randomUUID(),
    topic: crypto.randomUUID(),
    node: crypto.randomUUID(),
    tag: crypto.randomUUID(),
  };
  const nodeBase = {
    id: ids.node,
    topicId: ids.topic,
    title: `Rebuild ${ids.node}`,
    slug: `rebuild-${ids.node}`,
    revision: 3,
    verification: "verified" as const,
    createdBy: creator.id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    tags: [ids.tag],
    contentMd: "searchable rebuild content",
  };
  const markdownPath = `topics/${ids.topic}/${nodeBase.slug}.md`;
  const vault: StaticVault = {
    id: ids.vault,
    kind: "shared",
    topics: [{
      id: ids.topic,
      parentId: null,
      name: `Topic ${ids.topic}`,
      path: `topics/${ids.topic}`,
      createdBy: creator.id,
      createdAt: nodeBase.createdAt,
      updatedAt: nodeBase.updatedAt,
    }],
    tags: [{ id: ids.tag, name: `tag-${ids.tag}`, createdBy: creator.id, createdAt: nodeBase.createdAt }],
    nodes: [{
      ...nodeBase,
      markdownPath,
      sha256: sha256(renderMarkdown(nodeBase)),
    }],
    links: [{ from: ids.node, to: ids.node, type: "related" }],
  };
  const snapshot = verifyStaticVaultFiles(
    new Map(buildStaticVaultFiles(vault).map((file) => [file.path, file.content])),
  );

  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.insert(vaults).values({
        id: ids.vault,
        kind: "shared",
        name: `Rebuild ${ids.vault}`,
        gitRepoKey: `rebuild-${ids.vault}`,
      });
      await assertRebuildable(tx, snapshot);
      assert.equal((await tx.select().from(branches).where(eq(branches.vaultId, ids.vault))).length, 0);
      await applySnapshotInTransaction(tx, snapshot);
      assert.equal((await tx.select().from(branches).where(eq(branches.vaultId, ids.vault))).length, 1);
      assert.equal((await tx.select().from(treeNodes).where(eq(treeNodes.id, ids.node))).length, 1);
      assert.equal((await tx.select().from(treeNodeVersions).where(eq(treeNodeVersions.nodeId, ids.node))).length, 1);
      assert.equal((await tx.select().from(tags).where(eq(tags.id, ids.tag))).length, 1);
      assert.equal((await tx.select().from(nodeTags).where(eq(nodeTags.nodeId, ids.node))).length, 1);
      assert.equal((await tx.select().from(nodeLinks).where(eq(nodeLinks.fromNodeId, ids.node))).length, 1);
      await assert.rejects(applySnapshotInTransaction(tx, snapshot), /vault is not empty/);

      const missingUserVaultId = crypto.randomUUID();
      await tx.insert(vaults).values({
        id: missingUserVaultId,
        kind: "shared",
        name: `Missing user ${missingUserVaultId}`,
        gitRepoKey: `missing-user-${missingUserVaultId}`,
      });
      const missingUserSnapshot = {
        ...snapshot,
        id: missingUserVaultId,
        topics: snapshot.topics.map((topic) => ({ ...topic, createdBy: crypto.randomUUID() })),
      };
      await assert.rejects(
        applySnapshotInTransaction(tx, missingUserSnapshot),
        /createdBy user is missing/,
      );
      assert.equal(
        (await tx.select().from(branches).where(eq(branches.vaultId, missingUserVaultId))).length,
        0,
      );
      throw ROLLBACK;
    }),
    ROLLBACK,
  );
  assert.equal((await db.select().from(vaults).where(eq(vaults.id, ids.vault))).length, 0);
}
