import { eq, inArray } from "drizzle-orm";
import { db, type Tx } from "../src/db";
import { users } from "../src/modules/auth/schema";
import {
  branches,
  nodeLinks,
  nodeTags,
  tags,
  treeNodes,
  treeNodeVersions,
  vaults,
} from "../src/modules/knowledge/schema";
import { verifyStaticVaultFiles, type VerifiedStaticVault } from "../src/modules/knowledge/static-vault";
import { readStaticVaultRepo } from "./static-vault-repo";

function value(flag: string): string {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`missing ${flag}`);
  return process.argv[index + 1];
}

export async function assertRebuildable(tx: Tx, snapshot: VerifiedStaticVault) {
  const [vault] = await tx.select().from(vaults).where(eq(vaults.id, snapshot.id));
  if (!vault) throw new Error(`vault does not exist: ${snapshot.id}`);
  if (vault.kind !== snapshot.kind) throw new Error("vault kind does not match manifest");
  const [existingBranch] = await tx
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.vaultId, snapshot.id))
    .limit(1);
  if (existingBranch) throw new Error("vault is not empty");

  const creatorIds = [
    ...snapshot.topics.map((topic) => topic.createdBy),
    ...snapshot.nodes.map((node) => node.createdBy),
    ...snapshot.tags.map((tag) => tag.createdBy),
  ];
  const uniqueCreatorIds = [...new Set(creatorIds)];
  const existingUsers = uniqueCreatorIds.length
    ? await tx.select({ id: users.id }).from(users).where(inArray(users.id, uniqueCreatorIds))
    : [];
  if (existingUsers.length !== uniqueCreatorIds.length) throw new Error("manifest createdBy user is missing");
  return vault;
}

export async function applySnapshotInTransaction(
  tx: Tx,
  snapshot: VerifiedStaticVault,
): Promise<void> {
  const vault = await assertRebuildable(tx, snapshot);
    for (const topic of snapshot.topics) {
      await tx.insert(branches).values({
        id: topic.id,
        vaultId: snapshot.id,
        parentId: topic.parentId,
        name: topic.name,
        scope: snapshot.kind === "personal" ? "personal" : "team",
        ownerUserId: snapshot.kind === "personal" ? vault.ownerUserId : null,
        createdBy: topic.createdBy,
        createdAt: new Date(topic.createdAt),
        updatedAt: new Date(topic.updatedAt),
      });
    }
    for (const tag of snapshot.tags) {
      await tx.insert(tags).values({
        id: tag.id,
        name: tag.name,
        createdBy: tag.createdBy,
        createdAt: new Date(tag.createdAt),
      });
    }
    for (const node of snapshot.nodes) {
      await tx.insert(treeNodes).values({
        id: node.id,
        branchId: node.topicId,
        title: node.title,
        slug: node.slug,
        contentMd: node.contentMd,
        verification: node.verification,
        createdBy: node.createdBy,
        createdAt: new Date(node.createdAt),
        updatedAt: new Date(node.updatedAt),
        version: node.revision,
      });
      await tx.insert(treeNodeVersions).values({
        nodeId: node.id,
        seq: node.revision,
        contentMd: node.contentMd,
        verification: node.verification,
        createdBy: node.createdBy,
        changeSummary: "Rebuilt from static vault",
        createdAt: new Date(node.updatedAt),
      });
    }
    if (snapshot.nodes.some((node) => node.tags.length)) {
      await tx.insert(nodeTags).values(
        snapshot.nodes.flatMap((node) =>
          node.tags.map((tagId) => ({ nodeId: node.id, tagId })),
        ),
      );
    }
  if (snapshot.links.length)
    await tx.insert(nodeLinks).values(
      snapshot.links.map((link) => ({
        fromNodeId: link.from,
        toNodeId: link.to,
        linkType: link.type,
      })),
    );
}

async function applySnapshot(snapshot: VerifiedStaticVault): Promise<void> {
  await db.transaction(async (tx) => applySnapshotInTransaction(tx, snapshot));
}

async function main() {
  const repo = value("--repo");
  const vaultId = value("--vault-id");
  const apply = process.argv.includes("--apply");
  const snapshot = verifyStaticVaultFiles(await readStaticVaultRepo(repo));
  if (snapshot.id !== vaultId) throw new Error("manifest vault id does not match --vault-id");
  if (apply) {
    await applySnapshot(snapshot);
    console.log(`rebuilt vault ${vaultId}`);
  } else {
    await db.transaction(async (tx) => assertRebuildable(tx, snapshot));
    console.log(
      `dry run: vault ${vaultId} can rebuild ${snapshot.topics.length} topics, ${snapshot.nodes.length} nodes, ${snapshot.links.length} links`,
    );
  }
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
