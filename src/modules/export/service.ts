import { desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/jobs";
import { outboxEvents } from "@/db/outbox";
import { loanTickets } from "../circulation/schema";
import { notFound } from "@/lib/errors";
import { signDownload } from "@/lib/sign";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { dispatchOutbox } from "../notify/dispatcher";
import { objectStore } from "../storage/object-store";
import { sourceVersions } from "../storage/schema";
import {
  branches,
  nodeTags,
  promotions,
  tags,
  treeNodes,
  treeNodeVersions,
} from "../knowledge/schema";
import { exportJobs } from "./schema";
import { rendererFor, rendererAvailability } from "./renderer";
import { exportTarget, type ExportFile } from "./target";

// Module: export — document render jobs (docx/pdf, any role) and the one-way
// tree export to the content repo (Admin/Op). House rules: authorize() first;
// export.tree is audited (accountability operator) with its outbox event in
// the same transaction; document renders are read-style actions and are NOT
// audited (NFR audit list covers export.trigger only).

export type JobRef = {
  jobId: string;
  jobType: string;
  state: "queued" | "running" | "succeeded" | "failed" | "dead";
};

type RenderPayload = {
  nodeId: string;
  format: "docx" | "pdf";
  title: string;
  slug: string;
  requestedBy: string;
  result?: {
    objectKey: string;
    filename: string;
    contentType: string;
    converterWarnings: string[];
  };
};

const toJobRef = (row: typeof jobs.$inferSelect): JobRef => ({
  jobId: row.id,
  jobType: row.jobType,
  state: row.state,
});

// ---------------------------------------------------------------------------
// Document render (POST /tree/nodes/{nodeId}/export → 202 JobRef)
// ---------------------------------------------------------------------------

const RENDER_DELAY_MS = Number(process.env.RENDER_STUB_DELAY_MS ?? 300);

async function processRenderJob(jobId: string): Promise<void> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job || job.state !== "queued") return;
  await db
    .update(jobs)
    .set({ state: "running", attempts: job.attempts + 1, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));

  const payload = job.payload as RenderPayload;
  try {
    const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, payload.nodeId));
    if (!node) throw new Error("node not found");
    const rendered = await rendererFor(payload.format).render({
      markdown: node.contentMd,
      title: node.title,
      format: payload.format,
    });
    const objectKey = `exports/${node.id}/${jobId}.${rendered.extension}`;
    await objectStore.put(objectKey, rendered.body, rendered.contentType);
    const result: RenderPayload["result"] = {
      objectKey,
      filename: `${node.slug}.${rendered.extension}`,
      contentType: rendered.contentType,
      converterWarnings: rendered.converterWarnings,
    };
    await db
      .update(jobs)
      .set({ state: "succeeded", payload: { ...payload, result }, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));
  } catch (err) {
    await db
      .update(jobs)
      .set({ state: "failed", lastError: String(err), updatedAt: new Date() })
      .where(eq(jobs.id, jobId));
  }
}

/** In-process async execution, same substitution as the extraction stub. */
function enqueueRender(jobId: string): void {
  setTimeout(() => {
    void processRenderJob(jobId).catch((err) => console.error(`[render] ${jobId}:`, err));
  }, RENDER_DELAY_MS);
}

export async function requestRender(
  actor: Principal,
  nodeId: string,
  format: "docx" | "pdf",
): Promise<JobRef> {
  // export.document: all roles, global (authorization-design.md catalog).
  authorize(actor, "export.document", { kind: "read" });
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (!node) throw notFound();

  const idempotencyKey = `render:${nodeId}:${format}:${node.version}`;
  const payload: RenderPayload = {
    nodeId,
    format,
    title: node.title,
    slug: node.slug,
    requestedBy: actor.userId,
  };
  const [created] = await db
    .insert(jobs)
    .values({ jobType: "render", payload, idempotencyKey, state: "queued" })
    .onConflictDoNothing()
    .returning();
  if (created) {
    enqueueRender(created.id);
    return toJobRef(created);
  }
  // Same node version + format already rendered (or in flight): reuse it.
  const [existing] = await db.select().from(jobs).where(eq(jobs.idempotencyKey, idempotencyKey));
  if (existing.state === "failed" || existing.state === "dead") {
    // A previous attempt failed; re-run under the same key.
    const [requeued] = await db
      .update(jobs)
      .set({ state: "queued", lastError: null, updatedAt: new Date() })
      .where(eq(jobs.id, existing.id))
      .returning();
    enqueueRender(requeued.id);
    return toJobRef(requeued);
  }
  return toJobRef(existing);
}

/**
 * GET /api/jobs/{jobId} — dev addition (openapi has JobRef but no job-status
 * path; flagged in the report). Render jobs are readable by any signed-in
 * role (export.document is global); export_tree job ids resolve here too but
 * only for Admin/Op.
 */
export async function getJob(
  actor: Principal,
  jobId: string,
): Promise<JobRef & { result?: { downloadUrl: string; converterWarnings: string[] } }> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (row) {
    if (row.jobType !== "render") authorize(actor, "export.tree.trigger", { kind: "read" });
    else authorize(actor, "export.document", { kind: "read" });
    const result = (row.payload as RenderPayload).result;
    return {
      ...toJobRef(row),
      ...(result
        ? {
            result: {
              downloadUrl: `/api/blob/${signDownload(result.objectKey, result.filename)}`,
              converterWarnings: result.converterWarnings,
            },
          }
        : {}),
    };
  }
  // Tree export jobs live in export_jobs; read denial is 404 (no leak).
  authorize(actor, "export.tree.trigger", { kind: "read" });
  const [exportRow] = await db.select().from(exportJobs).where(eq(exportJobs.id, jobId));
  if (!exportRow) throw notFound();
  return { jobId: exportRow.id, jobType: "export_tree", state: exportRow.state };
}

// ---------------------------------------------------------------------------
// Tree export (POST /export/tree → 202 JobRef; Admin/Op; one-way)
// ---------------------------------------------------------------------------

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

async function processTreeExport(exportJobId: string): Promise<void> {
  await db
    .update(exportJobs)
    .set({ state: "running", updatedAt: new Date() })
    .where(eq(exportJobs.id, exportJobId));
  try {
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

    const files: ExportFile[] = [];
    const manifestFiles: Array<{ path: string; slug: string; publish: boolean }> = [];
    for (const node of nodes) {
      const filePath = `${slugify(node.branchName)}/${node.slug}.md`;
      files.push({
        path: filePath,
        content:
          frontMatter({
            ...node,
            tags: tagRows.filter((t) => t.nodeId === node.id).map((t) => t.name).sort(),
            sourceIds: sourceRows.filter((s) => s.nodeId === node.id).map((s) => s.sourceId).sort(),
          }) + node.contentMd + "\n",
      });
      manifestFiles.push({ path: filePath, slug: node.slug, publish: node.publish });
    }

    const { commitSha, changed } = await exportTarget.publish(
      files,
      `WisdomTree tree export ${exportJobId}`,
    );
    // No-change policy (documented): identical tree → NO new commit; the
    // manifest records changed=false and the previous HEAD sha.
    const manifest = { commitSha, changed, fileCount: files.length, files: manifestFiles };

    await db.transaction(async (tx) => {
      await tx
        .update(exportJobs)
        .set({ state: "succeeded", manifest, updatedAt: new Date() })
        .where(eq(exportJobs.id, exportJobId));
      await emitOutbox(tx, "export.completed", {
        exportJobId,
        commitSha,
        changed,
        fileCount: files.length,
      });
    });
  } catch (err) {
    await db.transaction(async (tx) => {
      await tx
        .update(exportJobs)
        .set({ state: "failed", error: String(err), updatedAt: new Date() })
        .where(eq(exportJobs.id, exportJobId));
      await emitOutbox(tx, "export.failed", { exportJobId, error: String(err) });
    });
  }
  void dispatchOutbox();
}

export async function triggerTreeExport(actor: Principal): Promise<JobRef> {
  authorize(actor, "export.tree.trigger", { kind: "write" });
  const job = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(exportJobs)
      .values({ scope: "full_tree", state: "queued", triggeredBy: actor.userId })
      .returning();
    // NFR audit list: export.trigger, accountability operator.
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "export.trigger",
      targetType: "export_job",
      targetId: created.id,
      details: { scope: "full_tree" },
    });
    return created;
  });
  setTimeout(() => {
    void processTreeExport(job.id).catch((err) => console.error(`[export] ${job.id}:`, err));
  }, 0);
  return { jobId: job.id, jobType: "export_tree", state: job.state };
}

// ---------------------------------------------------------------------------
// Admin health (GET /admin/health — HealthReport subset that is computable)
// ---------------------------------------------------------------------------

export async function healthReport(actor: Principal) {
  authorize(actor, "admin.health.read", { kind: "read" });
  const [jobCountRows, exportCountRows, [lastExport], [{ overdue }], [{ undispatched }]] =
    await Promise.all([
      db
        .select({ jobType: jobs.jobType, state: jobs.state, n: sql<number>`count(*)::int` })
        .from(jobs)
        .groupBy(jobs.jobType, jobs.state),
      db
        .select({ state: exportJobs.state, n: sql<number>`count(*)::int` })
        .from(exportJobs)
        .groupBy(exportJobs.state),
      db.select().from(exportJobs).orderBy(desc(exportJobs.createdAt)).limit(1),
      db
        .select({ overdue: sql<number>`count(*)::int` })
        .from(loanTickets)
        .where(
          sql`${loanTickets.state} IN ('borrowed','overdue') AND ${loanTickets.dueAt} IS NOT NULL AND ${loanTickets.dueAt} < now()`,
        ),
      db
        .select({ undispatched: sql<number>`count(*)::int` })
        .from(outboxEvents)
        .where(sql`${outboxEvents.dispatchedAt} IS NULL`),
    ]);

  const jobCounts: Record<string, Record<string, number>> = {};
  for (const row of jobCountRows) {
    (jobCounts[row.jobType] ??= {})[row.state] = row.n;
  }
  for (const row of exportCountRows) {
    (jobCounts["export_tree"] ??= {})[row.state] = row.n;
  }

  const availability = rendererAvailability();
  const degradedComponents: string[] = [];
  if (!availability.pandoc) degradedComponents.push("pandoc (document render runs the HTML stub)");
  else if (!availability.pdfEngine) degradedComponents.push("pdf-engine (pdf render runs the HTML stub)");

  return {
    // HealthReport fields that are cheap to compute in the demo; the rate
    // metrics (ocrFailureRate, publishSuccessRate, queueLatencySeconds,
    // backlogOver7Days, exportValidationFailures) have no demo data source
    // and are omitted — flagged in the build report.
    jobCounts,
    overdueLoanCount: overdue,
    outboxUndispatchedCount: undispatched, // dev extension field
    lastExport: lastExport
      ? {
          id: lastExport.id,
          state: lastExport.state,
          updatedAt: lastExport.updatedAt,
          commitSha: (lastExport.manifest as { commitSha?: string } | null)?.commitSha ?? null,
        }
      : null, // dev extension field
    lastBackupAt: null, // placeholder: no backup infrastructure in the demo
    backupStatus: "not_configured",
    degradedComponents,
  };
}
