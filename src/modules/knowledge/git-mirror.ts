import path from "node:path";
import { and, asc, eq, inArray, isNull, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { LocalGitExportTarget, type ExportFile } from "../export/target";
import {
  branches,
  nodeLinks,
  nodeTags,
  tags,
  treeNodes,
  vaultGitJobs,
  vaults,
} from "./schema";
import {
  buildStaticVaultFiles,
  renderMarkdown,
  sha256,
  verifyStaticVaultFiles,
  type StaticVault,
} from "./static-vault";

let timer: ReturnType<typeof setInterval> | undefined;
let processing = false;

function safeSegment(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "notes"
  );
}

async function buildVaultSnapshot(vault: typeof vaults.$inferSelect): Promise<ExportFile[]> {
  const [topicRows, nodeRows] = await Promise.all([
    db
      .select()
      .from(branches)
      .where(and(eq(branches.vaultId, vault.id), isNull(branches.archivedAt)))
      .orderBy(asc(branches.id)),
    db
      .select({
        id: treeNodes.id,
        branchId: treeNodes.branchId,
        title: treeNodes.title,
        slug: treeNodes.slug,
        contentMd: treeNodes.contentMd,
        verification: treeNodes.verification,
        createdBy: treeNodes.createdBy,
        createdAt: treeNodes.createdAt,
        updatedAt: treeNodes.updatedAt,
        version: treeNodes.version,
      })
      .from(treeNodes)
      .innerJoin(branches, eq(treeNodes.branchId, branches.id))
      .where(
        and(
          eq(branches.vaultId, vault.id),
          isNull(branches.archivedAt),
          ne(treeNodes.verification, "archived"),
        ),
      )
      .orderBy(asc(treeNodes.id)),
  ]);
  const nodeIds = nodeRows.map((node) => node.id);
  const [tagRows, linkRows] = nodeIds.length
    ? await Promise.all([
        db
          .select({
            nodeId: nodeTags.nodeId,
            id: tags.id,
            name: tags.name,
            createdBy: tags.createdBy,
            createdAt: tags.createdAt,
          })
          .from(nodeTags)
          .innerJoin(tags, eq(nodeTags.tagId, tags.id))
          .where(inArray(nodeTags.nodeId, nodeIds)),
        db
          .select({
            from: nodeLinks.fromNodeId,
            to: nodeLinks.toNodeId,
            type: nodeLinks.linkType,
          })
          .from(nodeLinks)
          .where(
            and(inArray(nodeLinks.fromNodeId, nodeIds), inArray(nodeLinks.toNodeId, nodeIds)),
          ),
      ])
    : [[], []];

  const topicPaths = new Map<string, string>();
  const pathOwners = new Map<string, string>();
  for (const topic of topicRows) {
    const base = `topics/${safeSegment(topic.name)}`;
    const owner = pathOwners.get(base);
    const topicPath = owner && owner !== topic.id ? `${base}-${topic.id}` : base;
    pathOwners.set(topicPath, topic.id);
    topicPaths.set(topic.id, topicPath);
  }
  const topicIds = new Set(topicRows.map((topic) => topic.id));
  const staticTopics = topicRows.map((topic) => ({
    id: topic.id,
    parentId: topic.parentId && topicIds.has(topic.parentId) ? topic.parentId : null,
    name: topic.name,
    path: topicPaths.get(topic.id)!,
    createdBy: topic.createdBy,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  }));
  const staticNodes = nodeRows.map((node) => {
    if (node.verification === "archived") throw new Error("archived node selected for export");
    const base = {
      id: node.id,
      topicId: node.branchId,
      title: node.title,
      slug: node.slug,
      revision: node.version,
      verification: node.verification,
      createdBy: node.createdBy,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
      tags: tagRows.filter((tag) => tag.nodeId === node.id).map((tag) => tag.id),
      contentMd: node.contentMd,
    };
    const markdownPath = `${topicPaths.get(node.branchId)}/${node.slug}.md`;
    return { ...base, markdownPath, sha256: sha256(renderMarkdown(base)) };
  });
  const usedTags = new Map(tagRows.map((tag) => [tag.id, tag]));
  const snapshot: StaticVault = {
    id: vault.id,
    kind: vault.kind,
    topics: staticTopics,
    tags: [...usedTags.values()].map((tag) => ({
      id: tag.id,
      name: tag.name,
      createdBy: tag.createdBy,
      createdAt: tag.createdAt.toISOString(),
    })),
    nodes: staticNodes,
    links: linkRows,
  };
  const files = buildStaticVaultFiles(snapshot);
  verifyStaticVaultFiles(new Map(files.map((file) => [file.path, file.content])));
  return files;
}

async function processNext(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    const [job] = await db
      .select()
      .from(vaultGitJobs)
      .where(
        and(
          inArray(vaultGitJobs.state, ["pending", "failed"]),
          lt(vaultGitJobs.attempts, 5),
        ),
      )
      .orderBy(asc(vaultGitJobs.createdAt))
      .limit(1);
    if (!job) return;

    const [claimed] = await db
      .update(vaultGitJobs)
      .set({
        state: "running",
        attempts: job.attempts + 1,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(vaultGitJobs.id, job.id),
          inArray(vaultGitJobs.state, ["pending", "failed"]),
        ),
      )
      .returning();
    if (!claimed) return;

    try {
      const [vault] = await db.select().from(vaults).where(eq(vaults.id, job.vaultId));
      if (!vault) throw new Error("vault not found");
      const files = await buildVaultSnapshot(vault);
      const root = path.resolve(process.env.VAULT_GIT_DIR ?? "./data/vault-repos");
      const target = new LocalGitExportTarget(path.join(root, `${vault.id}.git`));
      const result = await target.publish(files, `Mirror vault revision ${job.nodeVersionId}`);
      await db
        .update(vaultGitJobs)
        .set({
          state: "done",
          commitSha: result.commitSha,
          updatedAt: new Date(),
        })
        .where(eq(vaultGitJobs.id, job.id));
    } catch (error) {
      await db
        .update(vaultGitJobs)
        .set({
          state: "failed",
          lastError: error instanceof Error ? error.message : "Git mirror failed",
          updatedAt: new Date(),
        })
        .where(eq(vaultGitJobs.id, job.id));
    }
  } finally {
    processing = false;
  }
}

export function startVaultGitWorker(): void {
  if (timer) return;
  timer = setInterval(() => void processNext(), 5000);
  timer.unref();
  void processNext();
}
