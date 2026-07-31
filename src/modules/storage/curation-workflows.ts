import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { T } from "@/lib/vi";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { assertReviewScope } from "../auth/maker-checker";
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
  contentReviews,
  correctedTexts,
  curations,
  markdownDrafts,
  sources,
  sourceVersions,
  textChunks,
} from "./schema";

const contentSha256 = (content: string) =>
  createHash("sha256").update(Buffer.from(content, "utf8")).digest("hex");

// Curation workflow core (sequence-diagrams.md Flow 2): the optional
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
  if (ctx.curation?.state !== "under_correction") {
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
  if (ctx.curation?.state !== "under_correction") {
    throw new ApiError(409, "invalid_state", "Tư liệu không ở trạng thái đang hiệu đính.");
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
  if (ctx.curation?.state !== "under_correction") {
    throw new ApiError(409, "invalid_state", "Tư liệu không ở trạng thái đang hiệu đính.");
  }
  if (input.suggestedBranchId) {
    const [branch] = await db
      .select()
      .from(branches)
      .where(eq(branches.id, input.suggestedBranchId));
    if (
      !branch ||
      branch.archivedAt ||
      branch.scope !== "team" ||
      !actor.vaultIds?.includes(branch.vaultId)
    )
      throw notFound();
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
          updatedBy: actor.userId,
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
          updatedBy: actor.userId,
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
  const [draft] = await db
    .select()
    .from(markdownDrafts)
    .where(eq(markdownDrafts.sourceVersionId, versionId));
  if (!draft) throw new ApiError(409, "missing_draft", "Chưa có bản thảo để gửi duyệt.");
  if (!draft.suggestedBranchId) {
    throw new ApiError(
      409,
      "missing_target_branch",
      "Hãy chọn chuyên đề chung đích trước khi gửi duyệt.",
    );
  }

  const result = await db.transaction(async (tx) => {
    const [review] = await tx
      .insert(contentReviews)
      .values({
        targetType: "source_draft",
        sourceVersionId: versionId,
        contentSha256: contentSha256(draft.contentMd),
        originatorId: ctx.source.submittedBy,
        lastEditorId: draft.updatedBy,
        submittedBy: actor.userId,
        targetBranchId: draft.suggestedBranchId,
      })
      .returning();
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
      details: { sourceId, reviewId: review.id, contentSha256: review.contentSha256 },
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
  const [review] = await db
    .select()
    .from(contentReviews)
    .where(and(eq(contentReviews.sourceVersionId, versionId), eq(contentReviews.state, "pending")));
  if (!review) throw new ApiError(409, "missing_review", "Không có revision đang chờ duyệt.");
  if (!review.targetBranchId) {
    throw new ApiError(409, "missing_target_branch", "Revision chưa có chuyên đề chung đích.");
  }
  const [targetBranch] = await db
    .select({ vaultId: branches.vaultId })
    .from(branches)
    .where(eq(branches.id, review.targetBranchId));
  if (!targetBranch) throw notFound();
  const [reviewTask] = await db
    .select({ assignedTo: reviewTasks.assignedTo })
    .from(reviewTasks)
    .where(
      and(
        eq(reviewTasks.targetId, versionId),
        eq(reviewTasks.taskType, "publish"),
        inArray(reviewTasks.state, ["queued", "assigned", "in_review"]),
      ),
    );
  assertReviewScope(actor, {
    vaultId: targetBranch.vaultId,
    assignedTo: reviewTask?.assignedTo,
    review,
  });

  return db.transaction(async (tx) => {
    await tx
      .update(contentReviews)
      .set({
        state: "rejected",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
        version: review.version + 1,
      })
      .where(and(eq(contentReviews.id, review.id), eq(contentReviews.version, review.version)));
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

// ---------------------------------------------------------------------------
// Publish (independent reviewer; idempotent; promotion provenance)
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
    const [approvedScope] = await db
      .select({ review: contentReviews, vaultId: branches.vaultId })
      .from(contentReviews)
      .innerJoin(branches, eq(branches.id, contentReviews.targetBranchId))
      .where(
        and(
          eq(contentReviews.sourceVersionId, versionId),
          eq(contentReviews.state, "approved"),
        ),
      )
      .orderBy(desc(contentReviews.reviewedAt))
      .limit(1);
    if (!approvedScope) throw notFound();
    assertReviewScope(actor, {
      vaultId: approvedScope.vaultId,
      review: approvedScope.review,
    });
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
  const [review] = await db
    .select()
    .from(contentReviews)
    .where(and(eq(contentReviews.sourceVersionId, versionId), eq(contentReviews.state, "pending")));
  if (!review) throw new ApiError(409, "missing_review", "Không có revision đang chờ duyệt.");
  if (
    contentSha256(draft.contentMd) !== review.contentSha256 ||
    draft.updatedBy !== review.lastEditorId
  ) {
    throw new ApiError(409, "review_stale", "Bản thảo đã thay đổi sau khi gửi duyệt.");
  }
  if (!review.targetBranchId || input.branchId !== review.targetBranchId) {
    throw new ApiError(409, "target_branch_changed", "Chuyên đề đích không khớp revision đã duyệt.");
  }
  const [branch] = await db.select().from(branches).where(eq(branches.id, review.targetBranchId));
  if (!branch || branch.archivedAt) throw notFound();
  const [reviewTask] = await db
    .select({ assignedTo: reviewTasks.assignedTo })
    .from(reviewTasks)
    .where(
      and(
        eq(reviewTasks.targetId, versionId),
        eq(reviewTasks.taskType, "publish"),
        inArray(reviewTasks.state, ["queued", "assigned", "in_review"]),
      ),
    );
  assertReviewScope(actor, {
    vaultId: branch.vaultId,
    assignedTo: reviewTask?.assignedTo,
    review,
  });

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
          createdBy: ctx.source.submittedBy,
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
        createdBy: draft.updatedBy,
        changeSummary: `Xuất bản từ tư liệu "${ctx.source.title}"`,
        reviewStatus: "approved",
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

    const [approvedReview] = await tx
      .update(contentReviews)
      .set({
        state: "approved",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        targetBranchId: input.branchId,
        targetNodeId: node.id,
        verification: input.verification,
        excerptChunkIds: input.excerptChunkIds?.length ? input.excerptChunkIds : null,
        approvedNodeVersionId: nodeVersion.id,
        updatedAt: new Date(),
        version: review.version + 1,
      })
      .where(
        and(
          eq(contentReviews.id, review.id),
          eq(contentReviews.version, review.version),
          eq(contentReviews.state, "pending"),
        ),
      )
      .returning();
    if (!approvedReview) throw versionConflict();

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
        reviewId: approvedReview.id,
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
