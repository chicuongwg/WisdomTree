import { and, asc, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { assertIndependentReviewer } from "../auth/maker-checker";
import { users } from "../auth/schema";
import { recordAudit } from "../audit/service";
import { notifyEvent } from "../notify/fanout";
import { extractionCandidates, sources, sourceVersions } from "../storage/schema";
import { syncDerivedLinks, syncLinks, syncTags } from "./service-mutations";
import {
  branches,
  nodeChangeProposals,
  nodeLinks,
  nodePublicationProposals,
  nodeTags,
  promotions,
  tags,
  treeNodes,
  treeNodeVersions,
} from "./schema";

// Promotion — the single review boundary of the two-tier model: a personal
// node is proposed onto a team branch, an independent reviewer decides, and
// the approved snapshot becomes a promoted node (locked from then on; changes
// go through node change proposals).

async function uniqueSlug(tx: Tx, branchId: string, title: string): Promise<string> {
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
      .where(and(eq(treeNodes.branchId, branchId), eq(treeNodes.slug, candidate)));
    if (!taken) return candidate;
  }
}

export async function listPublicationTargets(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(
      and(
        eq(branches.scope, "team"),
        sql`${branches.archivedAt} IS NULL`,
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
  const [target] = await db
    .select({ branch: branches })
    .from(branches)
    .where(eq(branches.id, targetBranchId));
  if (!target || target.branch.archivedAt || target.branch.scope !== "team") {
    throw new ApiError(400, "invalid_target_branch", "Invalid target team branch.");
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
    throw new ApiError(409, "publication_pending", "This node already has a pending publication proposal.");
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
      "This version has already been published to the shared tree.",
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

  const result = await db.transaction(async (tx) => {
    const [proposal] = await tx
      .insert(nodePublicationProposals)
      .values({
        sourceNodeId: nodeId,
        sourceNodeVersion: row.node.version,
        sourceVersionId: sourceCandidate[0]?.sourceVersionId ?? null,
        targetBranchId,
        title: row.node.title,
        contentMd: row.node.contentMd,
        tags: tagRows.map((tag) => tag.name),
        links: linkRows,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.publication.submit",
      targetType: "node_publication_proposal",
      targetId: proposal.id,
      details: { nodeId, targetBranchId },
    });
    return { proposalId: proposal.id, state: proposal.state };
  });
  return result;
}

/** Pending proposals of both kinds, for the review surface. */
export async function listPendingProposals(actor: Principal) {
  authorize(actor, "knowledge.publish", { kind: "read" });
  const [publications, changes] = await Promise.all([
    db
      .select({
        id: nodePublicationProposals.id,
        title: nodePublicationProposals.title,
        targetBranchName: branches.name,
        authorName: users.displayName,
        createdBy: nodePublicationProposals.createdBy,
        createdAt: nodePublicationProposals.createdAt,
      })
      .from(nodePublicationProposals)
      .innerJoin(branches, eq(branches.id, nodePublicationProposals.targetBranchId))
      .innerJoin(users, eq(users.id, nodePublicationProposals.createdBy))
      .where(eq(nodePublicationProposals.state, "pending"))
      .orderBy(asc(nodePublicationProposals.createdAt)),
    db
      .select({
        id: nodeChangeProposals.id,
        nodeId: nodeChangeProposals.nodeId,
        title: nodeChangeProposals.title,
        authorName: users.displayName,
        createdBy: nodeChangeProposals.createdBy,
        createdAt: nodeChangeProposals.createdAt,
      })
      .from(nodeChangeProposals)
      .innerJoin(users, eq(users.id, nodeChangeProposals.createdBy))
      .where(eq(nodeChangeProposals.state, "pending"))
      .orderBy(asc(nodeChangeProposals.createdAt)),
  ]);
  return { publications, changes };
}

export async function getNodePublicationReview(actor: Principal, proposalId: string) {
  authorize(actor, "knowledge.publish", { kind: "read" });
  const [row] = await db
    .select({
      proposal: nodePublicationProposals,
      targetBranchName: branches.name,
      authorName: users.displayName,
      sourceNodeCreatedBy: treeNodes.createdBy,
      currentSourceVersion: treeNodes.version,
    })
    .from(nodePublicationProposals)
    .innerJoin(branches, eq(branches.id, nodePublicationProposals.targetBranchId))
    .innerJoin(treeNodes, eq(treeNodes.id, nodePublicationProposals.sourceNodeId))
    .innerJoin(users, eq(users.id, nodePublicationProposals.createdBy))
    .where(eq(nodePublicationProposals.id, proposalId));
  if (!row) throw notFound();
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
    canReview: ![row.proposal.createdBy, row.sourceNodeCreatedBy].includes(actor.userId),
    stale: row.currentSourceVersion !== row.proposal.sourceNodeVersion,
  };
}

export async function decideNodePublication(
  actor: Principal,
  proposalId: string,
  input: {
    decision: "approved" | "rejected" | "changes_requested";
    verification?: "unverified" | "verified";
    note?: string;
  },
) {
  authorize(actor, "knowledge.publish", { kind: "write" });
  const [row] = await db
    .select({
      proposal: nodePublicationProposals,
      sourceNodeCreatedBy: treeNodes.createdBy,
      sourceNodeVersion: treeNodes.version,
    })
    .from(nodePublicationProposals)
    .innerJoin(treeNodes, eq(treeNodes.id, nodePublicationProposals.sourceNodeId))
    .where(
      and(
        eq(nodePublicationProposals.id, proposalId),
        eq(nodePublicationProposals.state, "pending"),
      ),
    );
  if (!row) throw notFound();
  assertIndependentReviewer(actor.userId, { submittedBy: row.proposal.createdBy });
  const note = input.note?.trim() || null;
  if (input.decision !== "approved" && !note) {
    throw new ApiError(400, "review_note_required", "A note is required for this decision.");
  }

  if (input.decision !== "approved") {
    return db.transaction(async (tx) => {
      // The state='pending' guard doubles as the concurrency check.
      const [proposal] = await tx
        .update(nodePublicationProposals)
        .set({ state: input.decision, decisionNote: note, decidedBy: actor.userId, updatedAt: new Date() })
        .where(
          and(
            eq(nodePublicationProposals.id, proposalId),
            eq(nodePublicationProposals.state, "pending"),
          ),
        )
        .returning();
      if (!proposal) throw versionConflict();
      await recordAudit(tx, actor, {
        accountability: "approver_publisher",
        action: `node.publication.${input.decision}`,
        targetType: "node_publication_proposal",
        targetId: proposalId,
        details: { note },
      });
      return { state: input.decision };
    });
  }

  if (row.sourceNodeVersion !== row.proposal.sourceNodeVersion) {
    throw new ApiError(409, "review_stale", "The personal node changed after submission.");
  }
  if (!input.verification) {
    throw new ApiError(400, "missing_verification", "A verification level is required.");
  }
  if (!row.proposal.sourceVersionId && input.verification === "verified") {
    throw new ApiError(
      409,
      "source_required",
      "A node without a source can only be published as unverified.",
    );
  }

  const result = await db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, row.proposal.targetBranchId, row.proposal.title);
    const [node] = await tx
      .insert(treeNodes)
      .values({
        branchId: row.proposal.targetBranchId,
        title: row.proposal.title,
        slug,
        contentMd: row.proposal.contentMd,
        verification: input.verification!,
        createdBy: row.sourceNodeCreatedBy,
      })
      .returning();
    const [nodeVersion] = await tx
      .insert(treeNodeVersions)
      .values({
        nodeId: node.id,
        seq: 1,
        contentMd: row.proposal.contentMd,
        verification: input.verification!,
        createdBy: row.proposal.createdBy,
        changeSummary: "published_from_personal",
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
    const [proposal] = await tx
      .update(nodePublicationProposals)
      .set({
        state: "approved",
        decisionNote: note,
        decidedBy: actor.userId,
        approvedNodeVersionId: nodeVersion.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(nodePublicationProposals.id, proposalId),
          eq(nodePublicationProposals.state, "pending"),
        ),
      )
      .returning();
    if (!proposal) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.publication.approve",
      targetType: "tree_node",
      targetId: node.id,
      details: {
        proposalId,
        sourceNodeId: row.proposal.sourceNodeId,
        sourceVersionId: row.proposal.sourceVersionId,
        targetBranchId: row.proposal.targetBranchId,
        verification: input.verification,
      },
    });
    await notifyEvent(tx, "tree.node.published", {
      nodeId: node.id,
      branchId: node.branchId,
      sourceNodeId: row.proposal.sourceNodeId,
      sourceVersionId: row.proposal.sourceVersionId,
      uploaderId: row.sourceNodeCreatedBy,
      verification: input.verification,
    });
    return node;
  });
  return result;
}
