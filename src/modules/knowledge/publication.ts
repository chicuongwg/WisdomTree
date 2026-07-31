import { createHash } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { assertReviewScope, canReviewVault } from "../auth/maker-checker";
import { users } from "../auth/schema";
import { emitOutbox, recordAudit } from "../audit/service";
import { kickDispatch } from "../notify/dispatcher";
import { contentReviews, extractionCandidates, sources, sourceVersions } from "../storage/schema";
import { syncDerivedLinks, syncLinks, syncTags } from "./service-mutations";
import {
  branches,
  nodeLinks,
  nodePublicationProposals,
  nodeTags,
  promotions,
  reviewTasks,
  tags,
  treeNodes,
  treeNodeVersions,
} from "./schema";

type PublicationSnapshot = {
  sourceNodeId: string;
  sourceNodeVersion: number;
  sourceVersionId: string | null;
  targetBranchId: string;
  title: string;
  contentMd: string;
  tags: string[];
  links: Array<{ toNodeId: string; linkType: string }>;
};

function publicationSha256(value: PublicationSnapshot): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function uniqueSlug(tx: Tx, title: string): Promise<string> {
  const base =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "trang";
  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const [taken] = await tx
      .select({ id: treeNodes.id })
      .from(treeNodes)
      .where(eq(treeNodes.slug, candidate));
    if (!taken) return candidate;
  }
}

export async function listPublicationTargets(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  if (!actor.vaultIds?.length) return [];
  return db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(
      and(
        eq(branches.scope, "team"),
        sql`${branches.archivedAt} IS NULL`,
        inArray(branches.vaultId, actor.vaultIds),
      ),
    )
    .orderBy(asc(branches.name));
}

export async function getLatestPublicationForNode(actor: Principal, nodeId: string) {
  const [node] = await db
    .select({ node: treeNodes, branch: branches })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(treeNodes.id, nodeId));
  if (
    !node ||
    node.branch.scope !== "personal" ||
    node.branch.ownerUserId !== actor.userId ||
    node.node.verification === "archived"
  ) {
    return null;
  }
  const [proposal] = await db
    .select({
      id: nodePublicationProposals.id,
      state: nodePublicationProposals.state,
      targetBranchId: nodePublicationProposals.targetBranchId,
      targetBranchName: branches.name,
      decisionNote: nodePublicationProposals.decisionNote,
      approvedNodeId: treeNodeVersions.nodeId,
      sourceNodeVersion: nodePublicationProposals.sourceNodeVersion,
      currentNodeVersion: treeNodes.version,
      createdAt: nodePublicationProposals.createdAt,
    })
    .from(nodePublicationProposals)
    .innerJoin(branches, eq(branches.id, nodePublicationProposals.targetBranchId))
    .leftJoin(
      treeNodeVersions,
      eq(treeNodeVersions.id, nodePublicationProposals.approvedNodeVersionId),
    )
    .innerJoin(treeNodes, eq(treeNodes.id, nodePublicationProposals.sourceNodeId))
    .where(eq(nodePublicationProposals.sourceNodeId, nodeId))
    .orderBy(sql`${nodePublicationProposals.createdAt} DESC`)
    .limit(1);
  return proposal ?? null;
}

export async function submitNodePublication(
  actor: Principal,
  nodeId: string,
  targetBranchId: string,
) {
  const [row] = await db
    .select({ node: treeNodes, branch: branches })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(treeNodes.id, nodeId));
  if (
    !row ||
    row.node.verification === "archived" ||
    row.branch.scope !== "personal" ||
    row.branch.ownerUserId !== actor.userId
  ) {
    throw notFound();
  }
  const [target] = await db.select().from(branches).where(eq(branches.id, targetBranchId));
  if (
    !target ||
    target.archivedAt ||
    target.scope !== "team" ||
    !actor.vaultIds?.includes(target.vaultId)
  ) {
    throw new ApiError(400, "invalid_target_branch", "Chuyên đề chung đích không hợp lệ.");
  }
  const [pending] = await db
    .select({ id: nodePublicationProposals.id })
    .from(nodePublicationProposals)
    .where(
      and(
        eq(nodePublicationProposals.sourceNodeId, nodeId),
        eq(nodePublicationProposals.state, "pending"),
      ),
    );
  if (pending) {
    throw new ApiError(409, "publication_pending", "Trang này đã có đề cử đang chờ duyệt.");
  }
  const [alreadyPublished] = await db
    .select({ id: nodePublicationProposals.id })
    .from(nodePublicationProposals)
    .where(
      and(
        eq(nodePublicationProposals.sourceNodeId, nodeId),
        eq(nodePublicationProposals.sourceNodeVersion, row.node.version),
        eq(nodePublicationProposals.state, "approved"),
      ),
    );
  if (alreadyPublished) {
    throw new ApiError(
      409,
      "publication_unchanged",
      "Phiên bản hiện tại đã được duyệt lên cây chung.",
    );
  }

  const [tagRows, linkRows, sourceCandidate] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(nodeTags)
      .innerJoin(tags, eq(tags.id, nodeTags.tagId))
      .where(eq(nodeTags.nodeId, nodeId))
      .orderBy(asc(tags.name)),
    db
      .select({ toNodeId: nodeLinks.toNodeId, linkType: nodeLinks.linkType })
      .from(nodeLinks)
      .where(eq(nodeLinks.fromNodeId, nodeId))
      .orderBy(asc(nodeLinks.toNodeId), asc(nodeLinks.linkType)),
    db
      .select({ sourceVersionId: extractionCandidates.sourceVersionId })
      .from(extractionCandidates)
      .where(eq(extractionCandidates.evolvedNodeId, nodeId))
      .limit(1),
  ]);
  const snapshot: PublicationSnapshot = {
    sourceNodeId: nodeId,
    sourceNodeVersion: row.node.version,
    sourceVersionId: sourceCandidate[0]?.sourceVersionId ?? null,
    targetBranchId,
    title: row.node.title,
    contentMd: row.node.contentMd,
    tags: tagRows.map((tag) => tag.name),
    links: linkRows,
  };
  const hash = publicationSha256(snapshot);

  const result = await db.transaction(async (tx) => {
    const [proposal] = await tx
      .insert(nodePublicationProposals)
      .values({
        ...snapshot,
        snapshotSha256: hash,
        createdBy: actor.userId,
      })
      .returning();
    const [review] = await tx
      .insert(contentReviews)
      .values({
        targetType: "personal_node_publication",
        publicationProposalId: proposal.id,
        contentSha256: hash,
        originatorId: row.node.createdBy,
        lastEditorId: actor.userId,
        submittedBy: actor.userId,
        targetBranchId,
      })
      .returning();
    const [task] = await tx
      .insert(reviewTasks)
      .values({
        taskType: "publish",
        targetType: "node_publication_proposal",
        targetId: proposal.id,
        state: "queued",
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.publication.submit",
      targetType: "node_publication_proposal",
      targetId: proposal.id,
      details: { nodeId, targetBranchId, reviewId: review.id, snapshotSha256: hash },
    });
    return { proposalId: proposal.id, reviewTaskId: task.id, state: proposal.state };
  });
  kickDispatch();
  return result;
}

export async function getNodePublicationReview(actor: Principal, taskId: string) {
  authorize(actor, "review.draft.approve", { kind: "read" });
  const [row] = await db
    .select({
      task: reviewTasks,
      proposal: nodePublicationProposals,
      review: contentReviews,
      targetBranchName: branches.name,
      targetVaultId: branches.vaultId,
      authorName: users.displayName,
      currentSourceVersion: treeNodes.version,
    })
    .from(reviewTasks)
    .innerJoin(nodePublicationProposals, eq(nodePublicationProposals.id, reviewTasks.targetId))
    .innerJoin(
      contentReviews,
      eq(contentReviews.publicationProposalId, nodePublicationProposals.id),
    )
    .innerJoin(branches, eq(branches.id, nodePublicationProposals.targetBranchId))
    .innerJoin(treeNodes, eq(treeNodes.id, nodePublicationProposals.sourceNodeId))
    .innerJoin(users, eq(users.id, nodePublicationProposals.createdBy))
    .where(
      and(eq(reviewTasks.id, taskId), eq(reviewTasks.targetType, "node_publication_proposal")),
    );
  if (!row) throw notFound();
  if (!canReviewVault(actor, row.targetVaultId)) throw notFound();
  const independent = ![
    row.review.originatorId,
    row.review.lastEditorId,
    row.review.submittedBy,
  ].includes(actor.userId);
  const source = row.proposal.sourceVersionId
    ? (
        await db
          .select({ id: sources.id, title: sources.title })
          .from(sourceVersions)
          .innerJoin(sources, eq(sources.id, sourceVersions.sourceId))
          .where(eq(sourceVersions.id, row.proposal.sourceVersionId))
      )[0]
    : null;
  return {
    ...row,
    source: source ?? null,
    canReview: independent,
    stale: row.currentSourceVersion !== row.proposal.sourceNodeVersion,
  };
}

export async function decideNodePublication(
  actor: Principal,
  taskId: string,
  input: {
    decision: "approved" | "rejected" | "changes_requested";
    verification?: "unverified" | "verified";
    expectedReviewVersion: number;
    note?: string;
  },
) {
  authorize(actor, "knowledge.publish", { kind: "write" });
  const [row] = await db
    .select({
      task: reviewTasks,
      proposal: nodePublicationProposals,
      review: contentReviews,
      targetVaultId: branches.vaultId,
      sourceNodeVersion: treeNodes.version,
    })
    .from(reviewTasks)
    .innerJoin(nodePublicationProposals, eq(nodePublicationProposals.id, reviewTasks.targetId))
    .innerJoin(
      contentReviews,
      eq(contentReviews.publicationProposalId, nodePublicationProposals.id),
    )
    .innerJoin(branches, eq(branches.id, nodePublicationProposals.targetBranchId))
    .innerJoin(treeNodes, eq(treeNodes.id, nodePublicationProposals.sourceNodeId))
    .where(
      and(
        eq(reviewTasks.id, taskId),
        eq(reviewTasks.targetType, "node_publication_proposal"),
        eq(nodePublicationProposals.state, "pending"),
        eq(contentReviews.state, "pending"),
      ),
    );
  if (!row) throw notFound();
  assertReviewScope(actor, { vaultId: row.targetVaultId, review: row.review });
  const note = input.note?.trim() || null;
  if (input.decision !== "approved" && !note) {
    throw new ApiError(400, "review_note_required", "Vui lòng ghi lý do cho quyết định này.");
  }
  const snapshot: PublicationSnapshot = {
    sourceNodeId: row.proposal.sourceNodeId,
    sourceNodeVersion: row.proposal.sourceNodeVersion,
    sourceVersionId: row.proposal.sourceVersionId,
    targetBranchId: row.proposal.targetBranchId,
    title: row.proposal.title,
    contentMd: row.proposal.contentMd,
    tags: row.proposal.tags as string[],
    links: row.proposal.links as Array<{ toNodeId: string; linkType: string }>,
  };
  if (
    publicationSha256(snapshot) !== row.proposal.snapshotSha256 ||
    row.review.contentSha256 !== row.proposal.snapshotSha256
  ) {
    throw new ApiError(409, "review_stale", "Snapshot đề cử không còn khớp nội dung duyệt.");
  }

  if (input.decision !== "approved") {
    return db.transaction(async (tx) => {
      await tx
        .update(nodePublicationProposals)
        .set({ state: input.decision, decisionNote: note, updatedAt: new Date() })
        .where(eq(nodePublicationProposals.id, row.proposal.id));
      const [review] = await tx
        .update(contentReviews)
        .set({
          state: input.decision,
          reviewedBy: actor.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
          version: row.review.version + 1,
        })
        .where(
          and(
            eq(contentReviews.id, row.review.id),
            eq(contentReviews.version, input.expectedReviewVersion),
            eq(contentReviews.state, "pending"),
          ),
        )
        .returning();
      if (!review) throw versionConflict();
      await tx
        .update(reviewTasks)
        .set({
          state: input.decision,
          resolvedBy: actor.userId,
          updatedAt: new Date(),
          version: row.task.version + 1,
        })
        .where(eq(reviewTasks.id, taskId));
      await recordAudit(tx, actor, {
        accountability: "approver_publisher",
        action: `node.publication.${input.decision}`,
        targetType: "node_publication_proposal",
        targetId: row.proposal.id,
        details: { reviewId: row.review.id, note },
      });
      return { state: input.decision };
    });
  }

  if (row.sourceNodeVersion !== row.proposal.sourceNodeVersion) {
    throw new ApiError(409, "review_stale", "Trang cá nhân đã thay đổi sau khi gửi duyệt.");
  }
  if (!input.verification) {
    throw new ApiError(400, "missing_verification", "Thiếu mức thẩm định.");
  }
  if (!row.proposal.sourceVersionId && input.verification === "verified") {
    throw new ApiError(
      409,
      "source_required",
      "Trang không có tư liệu nguồn chỉ được xuất bản ở mức chưa thẩm định.",
    );
  }

  const result = await db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, row.proposal.title);
    const [node] = await tx
      .insert(treeNodes)
      .values({
        branchId: row.proposal.targetBranchId,
        title: row.proposal.title,
        slug,
        contentMd: row.proposal.contentMd,
        verification: input.verification!,
        createdBy: row.review.originatorId,
      })
      .returning();
    const [nodeVersion] = await tx
      .insert(treeNodeVersions)
      .values({
        nodeId: node.id,
        seq: 1,
        contentMd: row.proposal.contentMd,
        verification: input.verification!,
        createdBy: row.review.lastEditorId,
        changeSummary: `Xuất bản từ trang cá nhân "${row.proposal.title}"`,
        reviewStatus: "approved",
      })
      .returning();
    await syncTags(tx, actor, node.id, row.proposal.tags as string[]);
    await syncLinks(
      tx,
      node.id,
      row.proposal.links as Array<{ toNodeId: string; linkType: string }>,
    );
    await syncDerivedLinks(tx, node.id, node.title, node.contentMd);
    if (row.proposal.sourceVersionId) {
      await tx.insert(promotions).values({
        sourceVersionId: row.proposal.sourceVersionId,
        nodeVersionId: nodeVersion.id,
        approvedBy: actor.userId,
      });
    }
    await tx
      .update(nodePublicationProposals)
      .set({
        state: "approved",
        decisionNote: note,
        approvedNodeVersionId: nodeVersion.id,
        updatedAt: new Date(),
      })
      .where(eq(nodePublicationProposals.id, row.proposal.id));
    const [review] = await tx
      .update(contentReviews)
      .set({
        state: "approved",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        targetNodeId: node.id,
        verification: input.verification!,
        approvedNodeVersionId: nodeVersion.id,
        updatedAt: new Date(),
        version: row.review.version + 1,
      })
      .where(
        and(
          eq(contentReviews.id, row.review.id),
          eq(contentReviews.version, input.expectedReviewVersion),
          eq(contentReviews.state, "pending"),
        ),
      )
      .returning();
    if (!review) throw versionConflict();
    await tx
      .update(reviewTasks)
      .set({
        state: "approved",
        resolvedBy: actor.userId,
        updatedAt: new Date(),
        version: row.task.version + 1,
      })
      .where(eq(reviewTasks.id, taskId));
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.publication.approve",
      targetType: "tree_node",
      targetId: node.id,
      details: {
        proposalId: row.proposal.id,
        reviewId: review.id,
        sourceNodeId: row.proposal.sourceNodeId,
        sourceVersionId: row.proposal.sourceVersionId,
        targetBranchId: row.proposal.targetBranchId,
        verification: input.verification,
      },
    });
    await emitOutbox(tx, "tree.node.published", {
      nodeId: node.id,
      branchId: node.branchId,
      sourceNodeId: row.proposal.sourceNodeId,
      sourceVersionId: row.proposal.sourceVersionId,
      uploaderId: row.review.originatorId,
      verification: input.verification,
    });
    return node;
  });
  kickDispatch();
  return result;
}
