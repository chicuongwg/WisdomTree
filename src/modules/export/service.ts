import path from "node:path";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, ping } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import { loanTickets } from "../circulation/schema";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { sources, sourceVersions, spaces } from "../storage/schema";
import {
  branches,
  nodeLinks,
  nodeTags,
  nodeTranslations,
  promotions,
  tags,
  treeNodes,
  treeNodeVersions,
} from "../knowledge/schema";
import { wikiReleases } from "./schema";
import { publishToContentRepo, verifyContentRepo, type ExportFile } from "./target";
import { buildVaultFiles, hashVaultFiles } from "./vault";

// Module: export — the one-way tree export to the content repo (Admin/Op),
// run synchronously: the target is a local bare repo, so the whole export is
// a subsecond git commit and a job table would only add a poll loop around
// it. House rules: authorize() first; export.tree is audited (accountability
// operator) in the same transaction as nothing — the export itself is not a
// DB write, so the audit record is the transaction.

export type TreeExportResult = {
  commitSha: string;
  changed: boolean;
  fileCount: number;
};

/** Same Vietnamese-safe slugification as knowledge.uniqueSlug's base. */
function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "chuyen-de"
  );
}

const yamlString = (s: string) => JSON.stringify(s); // JSON strings are valid YAML

function frontMatter(node: {
  title: string;
  verification: string;
  publish: boolean;
  version: number;
  tags: string[];
  sourceIds: string[];
}): string {
  return [
    "---",
    `title: ${yamlString(node.title)}`,
    `verification: ${node.verification}`,
    `publish: ${node.publish}`,
    `tags: [${node.tags.map(yamlString).join(", ")}]`,
    `sources: [${node.sourceIds.map(yamlString).join(", ")}]`,
    `version: ${node.version}`,
    "---",
    "",
  ].join("\n");
}

export async function triggerTreeExport(actor: Principal): Promise<TreeExportResult> {
  authorize(actor, "export.tree.trigger", { kind: "write" });

  // Exactly one file per non-archived node; front-matter carries the
  // publish flag and provenance so the repo mirrors published tree state.
  const nodes = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      slug: treeNodes.slug,
      contentMd: treeNodes.contentMd,
      verification: treeNodes.verification,
      publish: treeNodes.publish,
      version: treeNodes.version,
      branchName: branches.name,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(ne(treeNodes.verification, "archived"))
    .orderBy(branches.name, treeNodes.slug);

  const tagRows = await db
    .select({ nodeId: nodeTags.nodeId, name: tags.name })
    .from(nodeTags)
    .innerJoin(tags, eq(nodeTags.tagId, tags.id));
  const sourceRows = await db
    .selectDistinct({ nodeId: treeNodeVersions.nodeId, sourceId: sourceVersions.sourceId })
    .from(promotions)
    .innerJoin(treeNodeVersions, eq(promotions.nodeVersionId, treeNodeVersions.id))
    .innerJoin(sourceVersions, eq(promotions.sourceVersionId, sourceVersions.id));

  const files: ExportFile[] = nodes.map((node) => ({
    path: `${slugify(node.branchName)}/${node.slug}.md`,
    content:
      frontMatter({
        ...node,
        tags: tagRows
          .filter((t) => t.nodeId === node.id)
          .map((t) => t.name)
          .sort(),
        sourceIds: sourceRows
          .filter((s) => s.nodeId === node.id)
          .map((s) => s.sourceId)
          .sort(),
      }) +
      node.contentMd +
      "\n",
  }));

  // No-change policy (documented): identical tree → NO new commit; the
  // response records changed=false and the previous HEAD sha.
  const { commitSha, changed } = await publishToContentRepo(
    files,
    `WisdomTree tree export ${new Date().toISOString()}`,
  );

  await db.transaction(async (tx) => {
    // NFR audit list: export.trigger, accountability operator.
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "export.trigger",
      targetType: "export",
      targetId: commitSha,
      details: { scope: "full_tree", commitSha, changed, fileCount: files.length },
    });
  });

  return { commitSha, changed, fileCount: files.length };
}

const releaseRepo = (spaceId: string) =>
  path.resolve(process.env.VAULT_GIT_DIR ?? "./data/vault-repos", `${spaceId}.git`);

async function releaseSpace(actor: Principal, spaceId: string, kind: "read" | "write") {
  authorize(actor, kind === "read" ? "knowledge.space.read" : "export.space.release", {
    spaceId,
    kind,
  });
  const [space] = await db
    .select({ id: spaces.id, name: spaces.name })
    .from(spaces)
    .where(and(eq(spaces.id, spaceId), eq(spaces.type, "team"), sql`${spaces.archivedAt} IS NULL`))
    .limit(1);
  if (!space) throw notFound();
  return space;
}

async function buildSpaceVault(spaceId: string, releaseNo: number) {
  const nodes = await db
    .select({
      id: treeNodes.id,
      branchId: branches.id,
      branchName: branches.name,
      branchSortOrder: branches.sortOrder,
      title: treeNodes.title,
      summary: treeNodes.summary,
      sortOrder: treeNodes.sortOrder,
      contentMd: treeNodes.contentMd,
      version: treeNodes.version,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(
      and(
        eq(branches.spaceId, spaceId),
        eq(branches.scope, "team"),
        sql`${branches.archivedAt} IS NULL`,
        eq(treeNodes.verification, "verified"),
        eq(treeNodes.publish, true),
      ),
    );
  if (!nodes.length) {
    throw new ApiError(422, "release_empty", "The space has no verified published pages.");
  }

  const nodeIds = nodes.map((node) => node.id);
  const [translationRows, tagRows, sourceRows, linkRows, sourceTitleRows] = await Promise.all([
    db
      .select({
        nodeId: nodeTranslations.nodeId,
        title: nodeTranslations.title,
        summary: nodeTranslations.summary,
        contentMd: nodeTranslations.contentMd,
        version: nodeTranslations.version,
      })
      .from(nodeTranslations)
      .where(inArray(nodeTranslations.nodeId, nodeIds)),
    db
      .select({ nodeId: nodeTags.nodeId, name: tags.name })
      .from(nodeTags)
      .innerJoin(tags, eq(nodeTags.tagId, tags.id))
      .where(inArray(nodeTags.nodeId, nodeIds)),
    db
      .selectDistinct({ nodeId: treeNodeVersions.nodeId, sourceId: sourceVersions.sourceId })
      .from(promotions)
      .innerJoin(treeNodeVersions, eq(promotions.nodeVersionId, treeNodeVersions.id))
      .innerJoin(sourceVersions, eq(promotions.sourceVersionId, sourceVersions.id))
      .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
      .where(and(inArray(treeNodeVersions.nodeId, nodeIds), eq(sources.spaceId, spaceId))),
    db
      .select({
        fromNodeId: nodeLinks.fromNodeId,
        toNodeId: nodeLinks.toNodeId,
        linkType: nodeLinks.linkType,
      })
      .from(nodeLinks)
      .where(inArray(nodeLinks.fromNodeId, nodeIds)),
    db.select({ title: sources.title }).from(sources).where(eq(sources.spaceId, spaceId)),
  ]);

  return buildVaultFiles({
    spaceId,
    releaseNo,
    knownTargets: sourceTitleRows.map((source) => source.title),
    nodes: nodes.map((node) => ({
      ...node,
      tags: tagRows
        .filter((tag) => tag.nodeId === node.id)
        .map((tag) => tag.name)
        .sort(),
      sourceIds: sourceRows
        .filter((source) => source.nodeId === node.id)
        .map((source) => source.sourceId)
        .sort(),
      translation: translationRows.find((translation) => translation.nodeId === node.id),
    })),
    links: linkRows,
  });
}

export async function createSpaceRelease(actor: Principal, spaceId: string) {
  const space = await releaseSpace(actor, spaceId, "write");
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${wikiReleases.releaseNo}), 0)::int + 1` })
    .from(wikiReleases)
    .where(eq(wikiReleases.spaceId, spaceId));
  const [release] = await db
    .insert(wikiReleases)
    .values({ spaceId, releaseNo: next, createdBy: actor.userId })
    .returning({ id: wikiReleases.id, releaseNo: wikiReleases.releaseNo });

  try {
    const { files, manifestSha256 } = await buildSpaceVault(spaceId, release.releaseNo);
    const published = await publishToContentRepo(
      files,
      `WisdomTree ${space.name} release ${release.releaseNo}`,
      releaseRepo(spaceId),
    );
    if (!(await verifyContentRepo(files, releaseRepo(spaceId)))) {
      throw new ApiError(
        500,
        "release_verification_failed",
        "Published release verification failed.",
      );
    }
    const [completed] = await db.transaction(async (tx) => {
      const rows = await tx
        .update(wikiReleases)
        .set({
          status: "released",
          snapshot: files,
          manifestSha256,
          commitSha: published.commitSha,
          releasedAt: new Date(),
        })
        .where(and(eq(wikiReleases.id, release.id), eq(wikiReleases.status, "building")))
        .returning();
      await recordAudit(tx, actor, {
        accountability: "operator",
        action: "wiki.release.create",
        targetType: "wiki_release",
        targetId: release.id,
        details: { spaceId, releaseNo: release.releaseNo, commitSha: published.commitSha },
      });
      return rows;
    });
    return { ...completed, fileCount: files.length };
  } catch (error) {
    await db
      .update(wikiReleases)
      .set({ status: "failed" })
      .where(and(eq(wikiReleases.id, release.id), eq(wikiReleases.status, "building")));
    throw error;
  }
}

export async function listSpaceReleases(actor: Principal, spaceId: string) {
  await releaseSpace(actor, spaceId, "read");
  return db
    .select({
      id: wikiReleases.id,
      releaseNo: wikiReleases.releaseNo,
      status: wikiReleases.status,
      manifestSha256: wikiReleases.manifestSha256,
      commitSha: wikiReleases.commitSha,
      createdAt: wikiReleases.createdAt,
      releasedAt: wikiReleases.releasedAt,
    })
    .from(wikiReleases)
    .where(eq(wikiReleases.spaceId, spaceId))
    .orderBy(desc(wikiReleases.releaseNo));
}

async function getRelease(actor: Principal, releaseId: string, kind: "read" | "write") {
  const [release] = await db
    .select()
    .from(wikiReleases)
    .where(eq(wikiReleases.id, releaseId))
    .limit(1);
  if (!release) throw notFound();
  await releaseSpace(actor, release.spaceId, kind);
  if (release.status !== "released")
    throw new ApiError(409, "release_not_ready", "Release is not ready.");
  return release;
}

export async function verifySpaceRelease(actor: Principal, releaseId: string) {
  const release = await getRelease(actor, releaseId, "read");
  const contentMatches = await verifyContentRepo(release.snapshot, releaseRepo(release.spaceId));
  const manifestMatches = hashVaultFiles(release.snapshot) === release.manifestSha256;
  return { releaseId, valid: contentMatches && manifestMatches, contentMatches, manifestMatches };
}

export async function rebuildSpaceRelease(actor: Principal, releaseId: string) {
  const release = await getRelease(actor, releaseId, "write");
  const published = await publishToContentRepo(
    release.snapshot,
    `WisdomTree release ${release.releaseNo} rebuild`,
    releaseRepo(release.spaceId),
  );
  if (!(await verifyContentRepo(release.snapshot, releaseRepo(release.spaceId)))) {
    throw new ApiError(500, "release_verification_failed", "Rebuilt release verification failed.");
  }
  await db.transaction(async (tx) => {
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "wiki.release.rebuild",
      targetType: "wiki_release",
      targetId: release.id,
      details: {
        spaceId: release.spaceId,
        releaseNo: release.releaseNo,
        commitSha: published.commitSha,
      },
    });
  });
  return { releaseId, commitSha: published.commitSha, changed: published.changed, valid: true };
}

// ---------------------------------------------------------------------------
// Admin health (GET /admin/health — HealthReport subset that is computable)
// ---------------------------------------------------------------------------

/**
 * The unauthenticated probe's whole question: can this process reach its
 * database? It lives beside healthReport so one module owns "is the system
 * well", and so the route handler needs no database import of its own.
 * No authorize(): a container healthcheck has no principal, and the answer
 * discloses nothing an unreachable port would not.
 */
export async function databaseReachable(): Promise<boolean> {
  return ping();
}

export async function healthReport(actor: Principal) {
  authorize(actor, "admin.health.read", { kind: "read" });
  const [{ overdue }] = await db
    .select({ overdue: sql<number>`count(*)::int` })
    .from(loanTickets)
    .where(
      sql`${loanTickets.state} IN ('borrowed','overdue') AND ${loanTickets.dueAt} IS NOT NULL AND ${loanTickets.dueAt} < now()`,
    );

  return {
    // When these numbers were read. The screen used to stamp them with its own
    // render time, which is the same thing only when nothing is cached and
    // nothing is slow — and a health board that misdates its readings is worse
    // than one that shows none.
    checkedAt: new Date(),
    overdueLoanCount: overdue,
    lastBackupAt: null, // placeholder: no backup infrastructure in the demo
    backupStatus: "not_configured",
  };
}
