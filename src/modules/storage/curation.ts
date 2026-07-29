import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { T } from "@/lib/vi";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { kickDispatch } from "../notify/dispatcher";
import {
  branches,
  reviewTasks,
  treeNodes,
  treeNodeVersions,
  promotions,
} from "../knowledge/schema";
import {
  branchGapRequests,
  correctedTexts,
  curations,
  markdownDrafts,
  sources,
  sourceVersions,
  textChunks,
} from "./schema";

// Curation → review → publish (sequence-diagrams.md Flow 2): the optional
// overlay on storage that produces tree knowledge with promotion provenance.
// Same house rules as every module: authorize() first, audit + outbox inside
// the mutation transaction, optimistic locking on versioned rows.

type VersionCtx = {
  source: typeof sources.$inferSelect;
  version: typeof sourceVersions.$inferSelect;
  curation: typeof curations.$inferSelect | null;
};

async function loadVersion(sourceId: string, versionId: string): Promise<VersionCtx> {
  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sourceVersions)
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(and(eq(sourceVersions.id, versionId), eq(sources.id, sourceId)));
  if (!row) throw notFound();
  const [curation] = await db
    .select()
    .from(curations)
    .where(eq(curations.sourceVersionId, versionId));
  return { ...row, curation: curation ?? null };
}

/** Owned-or-assigned check for curation work (enforcement pipeline step 3). */
function authorizeCurationWork(
  actor: Principal,
  permission: "storage.corrected.edit" | "storage.draft.edit",
  ctx: VersionCtx,
): void {
  authorize(actor, permission, {
    ownerIds: [ctx.curation?.assignedTo, ctx.source.submittedBy],
    kind: "write",
  });
}

// ---------------------------------------------------------------------------
// Assignment (Admin/Op) — opens curation as under_correction
// ---------------------------------------------------------------------------

export async function assignCuration(
  actor: Principal,
  sourceId: string,
  versionId: string,
  assigneeId: string,
) {
  authorize(actor, "storage.curation.assign", { kind: "write" });
  const ctx = await loadVersion(sourceId, versionId);
  const [assignee] = await db.select().from(users).where(eq(users.id, assigneeId));
  if (!assignee) throw notFound();
  if (ctx.curation && ["promoted", "rejected"].includes(ctx.curation.state)) {
    throw new ApiError(409, "invalid_state", "Việc hiệu đính của tư liệu này đã kết thúc.");
  }

  const result = await db.transaction(async (tx) => {
    let curation: typeof curations.$inferSelect;
    if (ctx.curation) {
      const [updated] = await tx
        .update(curations)
        .set({ assignedTo: assigneeId, updatedAt: new Date(), version: ctx.curation.version + 1 })
        .where(and(eq(curations.id, ctx.curation.id), eq(curations.version, ctx.curation.version)))
        .returning();
      if (!updated) throw versionConflict();
      curation = updated;
    } else {
      [curation] = await tx
        .insert(curations)
        .values({
          sourceVersionId: versionId,
          state: "under_correction",
          assignedTo: assigneeId,
          nominatedBy: actor.userId,
        })
        .returning();
    }
    await tx
      .update(sources)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(eq(sources.id, sourceId));
    await tx.insert(reviewTasks).values({
      taskType: "correction",
      targetType: "source_version",
      targetId: versionId,
      state: "assigned",
      assignedTo: assigneeId,
      createdBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "source.assign",
      targetType: "source",
      targetId: sourceId,
      details: { sourceVersionId: versionId, assigneeId },
    });
    await emitOutbox(tx, "source.assigned", {
      sourceId,
      sourceVersionId: versionId,
      assigneeId,
      uploaderId: ctx.source.submittedBy,
    });
    return curation;
  });
  kickDispatch();
  return result;
}

// ---------------------------------------------------------------------------
// Self-nomination (uploader) — opens curation unassigned
// ---------------------------------------------------------------------------

/**
 * The uploader pushes their own stored file toward the tree: creates the
 * curation row with no assignee. The admin inbox shows it as "chờ giao" and
 * assignCuration hands it to an editor from there.
 */
export async function nominateSource(actor: Principal, sourceId: string) {
  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sources)
    .innerJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .where(eq(sources.id, sourceId));
  if (!row) throw notFound();
  // Nominating your own upload is managing your source; Admin/Op passes by role.
  authorize(actor, "storage.source.manage", { ownerIds: [row.source.submittedBy], kind: "write" });
  if (row.version.storageState !== "stored") {
    throw new ApiError(409, "not_stored", T.sourceNotNominatable);
  }
  const [existing] = await db
    .select({ id: curations.id })
    .from(curations)
    .where(eq(curations.sourceVersionId, row.version.id));
  if (existing) {
    throw new ApiError(409, "already_nominated", T.sourceAlreadyNominated);
  }

  return db.transaction(async (tx) => {
    const [curation] = await tx
      .insert(curations)
      .values({
        sourceVersionId: row.version.id,
        state: "under_correction",
        assignedTo: null,
        nominatedBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.nominate",
      targetType: "source",
      targetId: sourceId,
      details: { sourceVersionId: row.version.id },
    });
    // ponytail: no notification event — the admin inbox surfaces it; wire an
    // event when the humanities team asks.
    return curation;
  });
}

/**
 * Uploader (or Admin/Op) withdraws/reverts a nomination before it is promoted to the tree.
 * Deletes the curation row so the source returns to "stored, never nominated" state.
 */
export async function revertNomination(actor: Principal, sourceId: string) {
  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sources)
    .innerJoin(sourceVersions, eq(sources.currentVersionId, sourceVersions.id))
    .where(eq(sources.id, sourceId));
  if (!row) throw notFound();
  authorize(actor, "storage.source.manage", { ownerIds: [row.source.submittedBy], kind: "write" });
  const [existing] = await db
    .select({ id: curations.id, state: curations.state })
    .from(curations)
    .where(eq(curations.sourceVersionId, row.version.id));
  if (!existing) {
    throw new ApiError(409, "not_nominated", T.sourceNotNominated);
  }
  if (existing.state === "promoted") {
    throw new ApiError(409, "already_promoted", T.sourceAlreadyPromoted);
  }

  return db.transaction(async (tx) => {
    await tx.delete(curations).where(eq(curations.id, existing.id));
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.nominate_revert",
      targetType: "source",
      targetId: sourceId,
      details: { sourceVersionId: row.version.id },
    });
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Corrected text (append-only revision chain)
// ---------------------------------------------------------------------------

export async function appendCorrectedText(
  actor: Principal,
  sourceId: string,
  versionId: string,
  content: string,
) {
  const ctx = await loadVersion(sourceId, versionId);
  authorizeCurationWork(actor, "storage.corrected.edit", ctx);
  if (ctx.curation && ["promoted", "rejected"].includes(ctx.curation.state)) {
    throw new ApiError(409, "invalid_state", "Việc hiệu đính của tư liệu này đã kết thúc.");
  }

  return db.transaction(async (tx) => {
    const [{ maxSeq }] = await tx
      .select({ maxSeq: sql<number>`coalesce(max(${correctedTexts.seq}), 0)::int` })
      .from(correctedTexts)
      .where(eq(correctedTexts.sourceVersionId, versionId));
    const [created] = await tx
      .insert(correctedTexts)
      .values({ sourceVersionId: versionId, seq: maxSeq + 1, content, editedBy: actor.userId })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "corrected_text.append",
      targetType: "source_version",
      targetId: versionId,
      details: { seq: created.seq, sourceId },
    });
    return created;
  });
}

// ---------------------------------------------------------------------------
// Markdown draft (optimistic-locked upsert)
// ---------------------------------------------------------------------------

export async function saveDraft(
  actor: Principal,
  sourceId: string,
  versionId: string,
  input: { contentMd: string; suggestedBranchId?: string; expectedVersion?: number },
) {
  const ctx = await loadVersion(sourceId, versionId);
  authorizeCurationWork(actor, "storage.draft.edit", ctx);
  if (ctx.curation && ["promoted", "rejected"].includes(ctx.curation.state)) {
    throw new ApiError(409, "invalid_state", "Việc hiệu đính của tư liệu này đã kết thúc.");
  }
  if (input.suggestedBranchId) {
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, input.suggestedBranchId));
    if (!branch) throw notFound();
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(markdownDrafts)
      .where(eq(markdownDrafts.sourceVersionId, versionId));
    let draft: typeof markdownDrafts.$inferSelect;
    if (existing) {
      const expected = input.expectedVersion ?? existing.version;
      const [updated] = await tx
        .update(markdownDrafts)
        .set({
          contentMd: input.contentMd,
          ...(input.suggestedBranchId !== undefined
            ? { suggestedBranchId: input.suggestedBranchId }
            : {}),
          updatedAt: new Date(),
          version: expected + 1,
        })
        .where(and(eq(markdownDrafts.id, existing.id), eq(markdownDrafts.version, expected)))
        .returning();
      if (!updated) throw versionConflict();
      draft = updated;
    } else {
      [draft] = await tx
        .insert(markdownDrafts)
        .values({
          sourceVersionId: versionId,
          contentMd: input.contentMd,
          suggestedBranchId: input.suggestedBranchId ?? null,
          createdBy: actor.userId,
        })
        .returning();
    }
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "draft.save",
      targetType: "markdown_draft",
      targetId: draft.id,
      details: { sourceVersionId: versionId, sourceId, version: draft.version },
    });
    return draft;
  });
}

// ---------------------------------------------------------------------------
// State transitions: ready_for_review / reject / approve
// ---------------------------------------------------------------------------

export async function markReadyForReview(actor: Principal, sourceId: string, versionId: string) {
  const ctx = await loadVersion(sourceId, versionId);
  authorizeCurationWork(actor, "storage.corrected.edit", ctx);
  if (!ctx.curation) throw notFound();
  if (ctx.curation.state !== "under_correction") {
    throw new ApiError(409, "invalid_state", "Tư liệu không ở trạng thái đang hiệu đính.");
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(curations)
      .set({ state: "ready_for_review", updatedAt: new Date(), version: ctx.curation!.version + 1 })
      .where(and(eq(curations.id, ctx.curation!.id), eq(curations.version, ctx.curation!.version)))
      .returning();
    if (!updated) throw versionConflict();
    // The correction task resolves; the publish decision queues (Flow 2).
    await tx
      .update(reviewTasks)
      .set({ state: "approved", resolvedBy: actor.userId, updatedAt: new Date() })
      .where(
        and(
          eq(reviewTasks.targetId, versionId),
          eq(reviewTasks.taskType, "correction"),
          inArray(reviewTasks.state, ["queued", "assigned", "in_review", "changes_requested"]),
        ),
      );
    await tx.insert(reviewTasks).values({
      taskType: "publish",
      targetType: "source_version",
      targetId: versionId,
      state: "queued",
      createdBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "curation.ready_for_review",
      targetType: "source_version",
      targetId: versionId,
      details: { sourceId },
    });
    await emitOutbox(tx, "source.ready_for_review", {
      sourceId,
      sourceVersionId: versionId,
      uploaderId: ctx.source.submittedBy,
    });
    return updated;
  });
  kickDispatch();
  return result;
}

/** Admin/Op closes curation as rejected; the item stays stored in Library. */
export async function rejectCuration(actor: Principal, sourceId: string, versionId: string) {
  authorize(actor, "review.corrected.approve", { kind: "write" });
  const ctx = await loadVersion(sourceId, versionId);
  if (!ctx.curation) throw notFound();
  if (ctx.curation.state === "promoted") {
    throw new ApiError(409, "invalid_state", "Tư liệu đã được xuất bản, không thể từ chối.");
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(curations)
      .set({ state: "rejected", updatedAt: new Date(), version: ctx.curation!.version + 1 })
      .where(and(eq(curations.id, ctx.curation!.id), eq(curations.version, ctx.curation!.version)))
      .returning();
    if (!updated) throw versionConflict();
    await tx
      .update(reviewTasks)
      .set({ state: "rejected", resolvedBy: actor.userId, updatedAt: new Date() })
      .where(
        and(
          eq(reviewTasks.targetId, versionId),
          inArray(reviewTasks.state, ["queued", "assigned", "in_review", "changes_requested"]),
        ),
      );
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "curation.reject",
      targetType: "source_version",
      targetId: versionId,
      details: { sourceId },
    });
    return updated;
  });
}

/** Admin/Op approves corrected text + draft ahead of the publish decision. */
export async function approveCuration(actor: Principal, sourceId: string, versionId: string) {
  authorize(actor, "review.draft.approve", { kind: "write" });
  const ctx = await loadVersion(sourceId, versionId);
  if (!ctx.curation || ctx.curation.state !== "ready_for_review") {
    throw new ApiError(409, "invalid_state", "Tư liệu chưa sẵn sàng để duyệt.");
  }

  const result = await db.transaction(async (tx) => {
    await tx
      .update(reviewTasks)
      .set({ state: "in_review", assignedTo: actor.userId, updatedAt: new Date() })
      .where(
        and(
          eq(reviewTasks.targetId, versionId),
          eq(reviewTasks.taskType, "publish"),
          inArray(reviewTasks.state, ["queued", "assigned"]),
        ),
      );
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "curation.approve",
      targetType: "source_version",
      targetId: versionId,
      details: { sourceId },
    });
    await emitOutbox(tx, "source.approved", {
      sourceId,
      sourceVersionId: versionId,
      uploaderId: ctx.source.submittedBy,
    });
    return { ok: true };
  });
  kickDispatch();
  return result;
}

// ---------------------------------------------------------------------------
// Publish (Admin/Op; idempotent; promotion provenance)
// ---------------------------------------------------------------------------

export async function publishFromSource(
  actor: Principal,
  sourceId: string,
  versionId: string,
  input: {
    branchId: string;
    nodeId?: string;
    verification: "unverified" | "verified";
    excerptChunkIds?: string[];
  },
) {
  authorize(actor, "knowledge.publish", { kind: "write" });
  const ctx = await loadVersion(sourceId, versionId);
  if (!ctx.curation) throw notFound();

  // Idempotency (Flow 2 note): a re-run after `promoted` finds the existing
  // promotion and returns its node instead of double-publishing.
  if (ctx.curation.state === "promoted") {
    const [existing] = await db
      .select({ node: treeNodes })
      .from(promotions)
      .innerJoin(treeNodeVersions, eq(promotions.nodeVersionId, treeNodeVersions.id))
      .innerJoin(treeNodes, eq(treeNodeVersions.nodeId, treeNodes.id))
      .where(eq(promotions.sourceVersionId, versionId))
      .orderBy(desc(promotions.createdAt))
      .limit(1);
    if (existing) return existing.node;
    throw new ApiError(409, "invalid_state", "Tư liệu đã xuất bản nhưng thiếu bản ghi nguồn dẫn.");
  }
  if (ctx.curation.state !== "ready_for_review") {
    throw new ApiError(409, "invalid_state", "Tư liệu chưa sẵn sàng để xuất bản.");
  }

  const [draft] = await db
    .select()
    .from(markdownDrafts)
    .where(eq(markdownDrafts.sourceVersionId, versionId));
  if (!draft) {
    throw new ApiError(409, "missing_draft", "Chưa có bản thảo để xuất bản.");
  }
  const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId));
  if (!branch || branch.archivedAt) throw notFound();

  if (input.excerptChunkIds?.length) {
    const found = await db
      .select({ id: textChunks.id })
      .from(textChunks)
      .where(
        and(
          eq(textChunks.sourceVersionId, versionId),
          inArray(textChunks.id, input.excerptChunkIds),
        ),
      );
    if (found.length !== input.excerptChunkIds.length) {
      throw new ApiError(400, "invalid_excerpts", "Trích đoạn dẫn chứng không thuộc tư liệu này.");
    }
  }

  const result = await db.transaction(async (tx) => {
    let node: typeof treeNodes.$inferSelect;
    let seq: number;
    if (input.nodeId) {
      const [target] = await tx.select().from(treeNodes).where(eq(treeNodes.id, input.nodeId));
      if (!target || target.verification === "archived") throw notFound();
      const [updated] = await tx
        .update(treeNodes)
        .set({
          contentMd: draft.contentMd,
          verification: input.verification,
          publish: target.publish && input.verification === "verified",
          updatedAt: new Date(),
          version: target.version + 1,
        })
        .where(and(eq(treeNodes.id, target.id), eq(treeNodes.version, target.version)))
        .returning();
      if (!updated) throw versionConflict();
      node = updated;
      const [{ maxSeq }] = await tx
        .select({ maxSeq: sql<number>`coalesce(max(${treeNodeVersions.seq}), 0)::int` })
        .from(treeNodeVersions)
        .where(eq(treeNodeVersions.nodeId, node.id));
      seq = maxSeq + 1;
    } else {
      const title = ctx.source.title;
      const slug = await uniqueNodeSlug(tx, title);
      [node] = await tx
        .insert(treeNodes)
        .values({
          branchId: input.branchId,
          title,
          slug,
          contentMd: draft.contentMd,
          verification: input.verification,
          createdBy: actor.userId,
        })
        .returning();
      seq = 1;
    }

    const [nodeVersion] = await tx
      .insert(treeNodeVersions)
      .values({
        nodeId: node.id,
        seq,
        contentMd: draft.contentMd,
        verification: input.verification,
        createdBy: actor.userId,
        changeSummary: `Xuất bản từ tư liệu "${ctx.source.title}"`,
      })
      .returning();

    // Durable evidence linkage: source version → node version (NFR).
    const [promotion] = await tx
      .insert(promotions)
      .values({
        sourceVersionId: versionId,
        nodeVersionId: nodeVersion.id,
        approvedBy: actor.userId,
        excerptChunkIds: input.excerptChunkIds?.length ? input.excerptChunkIds : null,
      })
      .returning();

    const [promoted] = await tx
      .update(curations)
      .set({ state: "promoted", updatedAt: new Date(), version: ctx.curation!.version + 1 })
      .where(and(eq(curations.id, ctx.curation!.id), eq(curations.version, ctx.curation!.version)))
      .returning();
    if (!promoted) throw versionConflict();

    await tx
      .update(reviewTasks)
      .set({ state: "approved", resolvedBy: actor.userId, updatedAt: new Date() })
      .where(
        and(
          eq(reviewTasks.targetId, versionId),
          eq(reviewTasks.taskType, "publish"),
          inArray(reviewTasks.state, ["queued", "assigned", "in_review"]),
        ),
      );

    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.publish",
      targetType: "tree_node",
      targetId: node.id,
      details: {
        sourceId,
        sourceVersionId: versionId,
        promotionId: promotion.id,
        verification: input.verification,
        excerptChunkIds: input.excerptChunkIds ?? [],
      },
    });
    await emitOutbox(tx, "tree.node.published", {
      nodeId: node.id,
      branchId: node.branchId,
      sourceId,
      sourceVersionId: versionId,
      uploaderId: ctx.source.submittedBy,
      verification: input.verification,
    });
    return node;
  });
  kickDispatch();
  return result;
}

// Local copy of the slug helper to avoid exporting knowledge internals.
async function uniqueNodeSlug(tx: Tx, title: string): Promise<string> {
  const base =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "trang";
  for (let n = 0; ; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const [taken] = await tx
      .select({ id: treeNodes.id })
      .from(treeNodes)
      .where(eq(treeNodes.slug, candidate));
    if (!taken) return candidate;
  }
}

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
