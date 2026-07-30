import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { kickDispatch } from "../notify/dispatcher";
import { branches, reviewTasks, treeNodes } from "../knowledge/schema";
import {
  branchGapRequests,
  correctedTexts,
  curations,
  markdownDrafts,
  sources,
  sourceVersions,
  textChunks,
} from "./schema";

// Curation review, workbench, and gap-request queries.

// ---------------------------------------------------------------------------
// Review queue + publish-review workbench (Admin/Op)
// ---------------------------------------------------------------------------

export async function listReviewQueue(
  actor: Principal,
  filter: { taskType?: string; state?: string },
) {
  authorize(actor, "review.draft.approve", { kind: "read" });
  const conds = [
    filter.taskType
      ? eq(reviewTasks.taskType, filter.taskType as (typeof reviewTasks.$inferSelect)["taskType"])
      : undefined,
    filter.state
      ? eq(reviewTasks.state, filter.state as (typeof reviewTasks.$inferSelect)["state"])
      : undefined,
  ];
  const rows = await db
    .select({
      task: reviewTasks,
      assigneeName: users.displayName,
    })
    .from(reviewTasks)
    .leftJoin(users, eq(reviewTasks.assignedTo, users.id))
    .where(and(...conds.filter(Boolean)))
    .orderBy(desc(reviewTasks.updatedAt));

  // Resolve target titles for source_version-targeted tasks in one query.
  const versionIds = rows
    .filter((r) => r.task.targetType === "source_version")
    .map((r) => r.task.targetId);
  const titles = versionIds.length
    ? await db
        .select({ versionId: sourceVersions.id, sourceId: sources.id, title: sources.title })
        .from(sourceVersions)
        .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
        .where(inArray(sourceVersions.id, versionIds))
    : [];
  const titleByVersion = new Map(titles.map((t) => [t.versionId, t]));
  return rows.map((r) => ({
    ...r.task,
    assigneeName: r.assigneeName,
    target: titleByVersion.get(r.task.targetId) ?? null,
  }));
}

/** Publish Review workbench: draft, corrected text, chunks, provenance chain. */
export async function getPublishReview(actor: Principal, reviewId: string) {
  authorize(actor, "review.draft.approve", { kind: "read" });
  const [task] = await db.select().from(reviewTasks).where(eq(reviewTasks.id, reviewId));
  if (!task || task.targetType !== "source_version") throw notFound();

  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sourceVersions)
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(eq(sourceVersions.id, task.targetId));
  if (!row) throw notFound();

  const [curationRow] = await db
    .select()
    .from(curations)
    .where(eq(curations.sourceVersionId, task.targetId));
  const [corrected] = await db
    .select()
    .from(correctedTexts)
    .where(eq(correctedTexts.sourceVersionId, task.targetId))
    .orderBy(desc(correctedTexts.seq))
    .limit(1);
  const [draft] = await db
    .select()
    .from(markdownDrafts)
    .where(eq(markdownDrafts.sourceVersionId, task.targetId));
  const chunks = await db
    .select()
    .from(textChunks)
    .where(eq(textChunks.sourceVersionId, task.targetId))
    .orderBy(textChunks.position);
  const [uploader] = await db
    .select({ id: users.id, name: users.displayName })
    .from(users)
    .where(eq(users.id, row.source.submittedBy));
  const assignee = curationRow?.assignedTo
    ? (
        await db
          .select({ id: users.id, name: users.displayName })
          .from(users)
          .where(eq(users.id, curationRow.assignedTo))
      )[0]
    : null;
  const suggestedBranch = draft?.suggestedBranchId
    ? (
        await db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(eq(branches.id, draft.suggestedBranchId))
      )[0]
    : null;

  return {
    reviewTask: task,
    source: row.source,
    sourceVersion: row.version,
    curation: curationRow ?? null,
    correctedText: corrected ?? null,
    draft: draft ?? null,
    chunks,
    uploader: uploader ?? null,
    assignee,
    suggestedBranch,
  };
}

// ---------------------------------------------------------------------------
// Curation detail for the Assigned Source Task / admin Source Detail screens
// ---------------------------------------------------------------------------

export async function getCurationWorkbench(actor: Principal, sourceId: string) {
  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sources)
    .innerJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .where(eq(sources.id, sourceId));
  if (!row) throw notFound();
  const [curationRow] = await db
    .select()
    .from(curations)
    .where(eq(curations.sourceVersionId, row.version.id));
  // Read gate: assigned editor, the uploader-editor, or Admin/Op; other
  // roles see 404 (no existence leak on out-of-scope reads).
  if (actor.role !== "admin_op") {
    if (
      actor.role !== "editor" ||
      ![curationRow?.assignedTo, row.source.submittedBy].includes(actor.userId)
    ) {
      throw notFound();
    }
  }

  const [chunks, correctedChain, draftRows, branchRows] = await Promise.all([
    db
      .select()
      .from(textChunks)
      .where(eq(textChunks.sourceVersionId, row.version.id))
      .orderBy(textChunks.position),
    db
      .select()
      .from(correctedTexts)
      .where(eq(correctedTexts.sourceVersionId, row.version.id))
      .orderBy(desc(correctedTexts.seq)),
    db.select().from(markdownDrafts).where(eq(markdownDrafts.sourceVersionId, row.version.id)),
    db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(sql`${branches.archivedAt} IS NULL`)
      .orderBy(branches.name),
  ]);
  return {
    source: row.source,
    version: row.version,
    curation: curationRow ?? null,
    chunks,
    correctedLatest: correctedChain[0] ?? null,
    correctedCount: correctedChain.length,
    draft: draftRows[0] ?? null,
    branches: branchRows,
  };
}

/** Editor home: curation work assigned to me (topbar “Việc được giao”). */
export async function myAssignedTasks(actor: Principal) {
  return db
    .select({
      curation: curations,
      sourceId: sources.id,
      title: sources.title,
      updatedAt: curations.updatedAt,
    })
    .from(curations)
    .innerJoin(sourceVersions, eq(curations.sourceVersionId, sourceVersions.id))
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(eq(curations.assignedTo, actor.userId))
    .orderBy(desc(curations.updatedAt));
}

// ---------------------------------------------------------------------------
// Source Inbox (Admin/Op) + gap-request triage
// ---------------------------------------------------------------------------

/**
 * Who curation work can be handed to. Same role set `assignCuration` accepts,
 * read from one place so the picker cannot offer someone the assign call would
 * then refuse.
 */
export async function listAssignableEditors(actor: Principal) {
  authorize(actor, "storage.curation.assign", { kind: "read" });
  return db
    .select({ id: users.id, name: users.displayName })
    .from(users)
    .where(inArray(users.role, ["editor", "admin_op"]));
}

/**
 * The second intake mode: ask for something the collection is missing, when
 * you have no file to upload. `/source/mine` has always rendered this row type
 * and the triage flow has always been able to convert one into a branch — but
 * nothing could create one, so the whole path was unreachable.
 *
 * Rides `storage.intake.open` per the authz matrix allowlist: opening intake
 * and submitting a gap are the same capability for a baseline member.
 */
export async function createGapRequest(
  actor: Principal,
  input: { title?: string; description?: string },
) {
  authorize(actor, "storage.intake.open", { kind: "write" });
  const title = input.title?.trim();
  if (!title) throw new ApiError(400, "invalid_gap", "Vui lòng nhập nội dung cần bổ sung.");

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(branchGapRequests)
      .values({
        title,
        description: input.description?.trim() || null,
        state: "submitted",
        submittedBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "gap.submit",
      targetType: "branch_gap_request",
      targetId: row.id,
      details: { title: row.title },
    });
    await emitOutbox(tx, "gap.submitted", { requestId: row.id, title: row.title });
    return row;
  });

  kickDispatch();
  return created;
}

/** Gap requests that were converted into this branch — the branch hub's "open gaps". */
export async function listGapsForBranch(actor: Principal, branchId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select()
    .from(branchGapRequests)
    .where(eq(branchGapRequests.convertedBranchId, branchId));
}

export async function listInbox(actor: Principal) {
  authorize(actor, "storage.source.read_all", { kind: "read" });
  const [sourceRows, gapRows] = await Promise.all([
    db
      .select({
        source: sources,
        assigneeName: users.displayName,
        curationState: curations.state,
        curationAssignedTo: curations.assignedTo,
      })
      .from(sources)
      .leftJoin(users, eq(sources.assignedTo, users.id))
      .leftJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
      .leftJoin(curations, eq(curations.sourceVersionId, sourceVersions.id))
      .orderBy(desc(sources.updatedAt)),
    db.select().from(branchGapRequests).orderBy(desc(branchGapRequests.updatedAt)),
  ]);
  return { sources: sourceRows, gapRequests: gapRows };
}

export async function getGapRequest(actor: Principal, requestId: string) {
  authorize(actor, "storage.source.read_all", { kind: "read" });
  const [request] = await db
    .select()
    .from(branchGapRequests)
    .where(eq(branchGapRequests.id, requestId));
  if (!request) throw notFound();
  const [submitter] = await db
    .select({ name: users.displayName })
    .from(users)
    .where(eq(users.id, request.submittedBy));
  return { ...request, submitterName: submitter?.name ?? null };
}

type GapState = (typeof branchGapRequests.$inferSelect)["state"];

async function gapTransition(
  actor: Principal,
  requestId: string,
  to: GapState,
  allowedFrom: GapState[],
  extra?: Partial<typeof branchGapRequests.$inferInsert>,
) {
  authorize(actor, "storage.gap.triage", { kind: "write" });
  const [request] = await db
    .select()
    .from(branchGapRequests)
    .where(eq(branchGapRequests.id, requestId));
  if (!request) throw notFound();
  if (!allowedFrom.includes(request.state)) {
    throw new ApiError(
      409,
      "invalid_state",
      "Đề xuất không ở trạng thái phù hợp cho thao tác này.",
    );
  }
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(branchGapRequests)
      .set({
        state: to,
        triagedBy: actor.userId,
        ...extra,
        updatedAt: new Date(),
        version: request.version + 1,
      })
      .where(
        and(eq(branchGapRequests.id, requestId), eq(branchGapRequests.version, request.version)),
      )
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: `gap_request.${to}`,
      targetType: "branch_gap_request",
      targetId: requestId,
      details: { from: request.state, to, ...extra },
    });
    return updated;
  });
}

export const triageGapRequest = (actor: Principal, requestId: string) =>
  gapTransition(actor, requestId, "triaged", ["submitted"]);

export async function convertGapRequest(
  actor: Principal,
  requestId: string,
  target: { branchId?: string; nodeId?: string },
) {
  if (!target.branchId && !target.nodeId) {
    throw new ApiError(400, "invalid_convert", "Vui lòng chọn chuyên đề hoặc trang tri thức đích.");
  }
  if (target.branchId) {
    const [branch] = await db.select().from(branches).where(eq(branches.id, target.branchId));
    if (!branch) throw notFound();
  }
  if (target.nodeId) {
    const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, target.nodeId));
    if (!node) throw notFound();
  }
  return gapTransition(actor, requestId, "converted_to_branch", ["triaged"], {
    convertedBranchId: target.branchId ?? null,
    convertedNodeId: target.nodeId ?? null,
  });
}

export const rejectGapRequest = (actor: Principal, requestId: string) =>
  gapTransition(actor, requestId, "rejected", ["submitted", "triaged"]);

export const archiveGapRequest = (actor: Principal, requestId: string) =>
  gapTransition(actor, requestId, "archived", ["triaged", "converted_to_branch", "rejected"]);
