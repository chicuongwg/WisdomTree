import { eq, ne, sql } from "drizzle-orm";
import { db, ping } from "@/db";
import { loanTickets } from "../circulation/schema";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { sourceVersions } from "../storage/schema";
import {
  branches,
  nodeTags,
  promotions,
  tags,
  treeNodes,
  treeNodeVersions,
} from "../knowledge/schema";
import { exportTarget, type ExportFile } from "./target";

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
  const { commitSha, changed } = await exportTarget.publish(
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
