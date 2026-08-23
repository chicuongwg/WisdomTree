import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { backlinkContext, buildWikiIndex, normalizeTitle } from "@/lib/wikilink";
import type { Principal } from "../auth/principal";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { sources, sourceVersions } from "../storage/schema";
import {
  branches,
  nodeProposals,
  nodeLinks,
  nodeTags,
  promotions,
  tags,
  treeNodes,
  treeNodeVersions,
} from "./schema";

// Knowledge branch and read/query operations.

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

/**
 * Knowledge scope & visibility: a team branch is visible to every member,
 * a personal branch only to its owner. The branch row itself carries the
 * whole rule (scope + owner_user_id).
 */
export function branchVisibilityCondition(actor: Principal) {
  return and(
    sql`${branches.archivedAt} IS NULL`,
    or(eq(branches.scope, "team"), eq(branches.ownerUserId, actor.userId)),
  );
}

export async function listBranches(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({
      id: branches.id,
      name: branches.name,
      description: branches.description,
      scope: branches.scope,
      ownerUserId: branches.ownerUserId,
      createdBy: branches.createdBy,
      updatedAt: branches.updatedAt,
      version: branches.version,
      nodeCount: sql<number>`count(${treeNodes.id}) FILTER (WHERE ${treeNodes.verification} <> 'archived')::int`,
      verifiedCount: sql<number>`count(${treeNodes.id}) FILTER (WHERE ${treeNodes.verification} = 'verified')::int`,
    })
    .from(branches)
    .leftJoin(treeNodes, eq(treeNodes.branchId, branches.id))
    .where(branchVisibilityCondition(actor))
    .groupBy(branches.id)
    .orderBy(asc(branches.name));
}

/**
 * Shell sidebar: live branches split into two groups.
 *   team     → scope='team' branches, visible to all members
 *   personal → scope='personal' branches granted to this actor
 * Each branch carries its non-archived node list (two queries total).
 */
export async function treeOutline(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const branchRows = await db
    .select({
      id: branches.id,
      name: branches.name,
      scope: branches.scope,
      ownerUserId: branches.ownerUserId,
    })
    .from(branches)
    .where(branchVisibilityCondition(actor))
    .orderBy(asc(branches.name));
  const nodeRows = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      branchId: treeNodes.branchId,
      verification: treeNodes.verification,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(ne(treeNodes.verification, "archived"), branchVisibilityCondition(actor)))
    .orderBy(desc(treeNodes.updatedAt));
  const withNodes = branchRows.map((b) => ({
    ...b,
    nodes: nodeRows.filter((n) => n.branchId === b.id),
  }));
  return {
    team: withNodes.filter((b) => b.scope === "team"),
    personal: withNodes.filter((b) => b.scope === "personal"),
  };
}

export async function getBranch(actor: Principal, branchId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
  if (!branch || branch.archivedAt) throw notFound();
  if (branch.scope !== "team" && branch.ownerUserId !== actor.userId) throw notFound();
  const nodes = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      slug: treeNodes.slug,
      verification: treeNodes.verification,
      publish: treeNodes.publish,
      updatedAt: treeNodes.updatedAt,
    })
    .from(treeNodes)
    .where(and(eq(treeNodes.branchId, branchId), ne(treeNodes.verification, "archived")))
    .orderBy(desc(treeNodes.updatedAt));
  return { ...branch, nodes };
}

export async function createBranch(
  actor: Principal,
  input: { name: string; description?: string; scope?: string },
) {
  if (input.scope !== "personal") {
    throw new ApiError(
      403,
      "submission_required",
      "Team branches start from a member proposal.",
    );
  }
  // The personal vault is the actor's own ground, whatever their global role.
  authorize(actor, "knowledge.branch.create", { ownerIds: [actor.userId], kind: "write" });
  return db.transaction(async (tx) => {
    const [dup] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(
        and(
          eq(branches.scope, "personal"),
          eq(branches.ownerUserId, actor.userId),
          eq(branches.name, input.name),
        ),
      );
    if (dup) {
      throw new ApiError(409, "branch_exists", "A branch with this name already exists here.");
    }
    const [created] = await tx
      .insert(branches)
      .values({
        name: input.name,
        description: input.description ?? null,
        scope: "personal",
        ownerUserId: actor.userId,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "branch.create",
      targetType: "branch",
      targetId: created.id,
      details: { name: input.name },
    });
    return created;
  });
}

export async function updateBranch(
  actor: Principal,
  branchId: string,
  patch: { name?: string; description?: string; expectedVersion?: number },
) {
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
  if (!branch) throw notFound();
  authorize(actor, "knowledge.branch.edit", { ownerIds: [branch.createdBy], kind: "write" });
  const expected = patch.expectedVersion ?? branch.version;
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(branches)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        updatedAt: new Date(),
        version: expected + 1,
      })
      .where(and(eq(branches.id, branchId), eq(branches.version, expected)))
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "branch.update",
      targetType: "branch",
      targetId: branchId,
      details: { name: patch.name },
    });
    return updated;
  });
}

// ---------------------------------------------------------------------------
// Tree browse / search / node read
// ---------------------------------------------------------------------------

export async function recentNodes(actor: Principal, limit = 8) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      slug: treeNodes.slug,
      branchId: treeNodes.branchId,
      branchName: branches.name,
      verification: treeNodes.verification,
      updatedAt: treeNodes.updatedAt,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(ne(treeNodes.verification, "archived"), branchVisibilityCondition(actor)))
    .orderBy(desc(treeNodes.updatedAt))
    .limit(limit);
}

/** Full-text search over tree_nodes.tsv (generated column, migration 0001). */
export async function searchTree(actor: Principal, q: string, page = 1) {
  authorize(actor, "knowledge.search", { kind: "read" });
  const query = q.trim();
  if (!query) return [];
  return db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      slug: treeNodes.slug,
      branchId: treeNodes.branchId,
      branchName: branches.name,
      verification: treeNodes.verification,
      snippet: sql<string>`left(${treeNodes.contentMd}, 180)`,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(
      and(
        ne(treeNodes.verification, "archived"),
        branchVisibilityCondition(actor),
        sql`${treeNodes}.tsv @@ plainto_tsquery('simple', immutable_unaccent(${query}))`,
      ),
    )
    .orderBy(
      sql`ts_rank(${treeNodes}.tsv, plainto_tsquery('simple', immutable_unaccent(${query}))) DESC`,
    )
    .limit(PAGE_SIZE)
    .offset((Math.max(1, page) - 1) * PAGE_SIZE);
}

export async function getNode(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [row] = await db
    .select({
      node: treeNodes,
      branchName: branches.name,
      branchScope: branches.scope,
      branchOwnerId: branches.ownerUserId,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(eq(treeNodes.id, nodeId), branchVisibilityCondition(actor)));
  if (!row) throw notFound();

  const [tagRows, linkRows, backlinkRows, provenance, personalOrigins] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(nodeTags)
      .innerJoin(tags, eq(nodeTags.tagId, tags.id))
      .where(eq(nodeTags.nodeId, nodeId)),
    db
      .select({
        toNodeId: nodeLinks.toNodeId,
        linkType: nodeLinks.linkType,
        title: treeNodes.title,
      })
      .from(nodeLinks)
      .innerJoin(treeNodes, eq(nodeLinks.toNodeId, treeNodes.id))
      .where(eq(nodeLinks.fromNodeId, nodeId)),
    // Backlinks — the incoming half of the graph (WHERE to_node_id = :id).
    // Kept apart from provenance on purpose: provenance answers "what source
    // backs this page", backlinks answer "which pages point here".
    db
      .select({
        fromNodeId: nodeLinks.fromNodeId,
        linkType: nodeLinks.linkType,
        title: treeNodes.title,
        contentMd: treeNodes.contentMd,
        verification: treeNodes.verification,
      })
      .from(nodeLinks)
      .innerJoin(treeNodes, eq(nodeLinks.fromNodeId, treeNodes.id))
      .where(and(eq(nodeLinks.toNodeId, nodeId), ne(treeNodes.verification, "archived")))
      .orderBy(asc(treeNodes.title)),
    // Provenance backbone: promotions → source version → source (Flow 2 NFR).
    db
      .select({
        sourceVersionId: promotions.sourceVersionId,
        excerptChunkIds: promotions.excerptChunkIds,
        approvedBy: promotions.approvedBy,
        approvedByName: users.displayName,
        createdAt: promotions.createdAt,
        sourceId: sources.id,
        sourceTitle: sources.title,
      })
      .from(promotions)
      .innerJoin(treeNodeVersions, eq(promotions.nodeVersionId, treeNodeVersions.id))
      .innerJoin(sourceVersions, eq(promotions.sourceVersionId, sourceVersions.id))
      .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
      .innerJoin(users, eq(promotions.approvedBy, users.id))
      .where(eq(treeNodeVersions.nodeId, nodeId))
      .orderBy(desc(promotions.createdAt)),
    db
      .select({
        sourceNodeId: nodeProposals.nodeId,
        sourceTitle: nodeProposals.title,
        approvedByName: users.displayName,
        reviewedAt: nodeProposals.updatedAt,
      })
      .from(nodeProposals)
      .innerJoin(
        treeNodeVersions,
        eq(nodeProposals.approvedNodeVersionId, treeNodeVersions.id),
      )
      .innerJoin(users, eq(nodeProposals.decidedBy, users.id))
      .where(and(eq(nodeProposals.kind, "publication"), eq(treeNodeVersions.nodeId, nodeId))),
  ]);

  return {
    ...row.node,
    branchName: row.branchName,
    branchScope: row.branchScope,
    branchOwnerId: row.branchOwnerId,
    tags: tagRows.map((t) => t.name),
    links: linkRows,
    backlinks: backlinkRows.map((b) => ({
      fromNodeId: b.fromNodeId,
      linkType: b.linkType,
      title: b.title,
      verification: b.verification,
      // The sentence around the wiki-link when it is derivable, else the
      // source page's opening line.
      context: backlinkContext(b.contentMd, normalizeTitle(row.node.title)),
    })),
    provenance,
    personalOrigins,
  };
}

/** Title → node index used to resolve `[[wiki-links]]` while rendering. */
export async function wikiIndex(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const rows = await db
    .select({ id: treeNodes.id, title: treeNodes.title, verification: treeNodes.verification })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(ne(treeNodes.verification, "archived"), branchVisibilityCondition(actor)))
    .orderBy(asc(treeNodes.updatedAt));
  const nodeIndex: Record<
    string,
    { id: string; title: string; verification: string; kind: "node" | "source" }
  > = buildWikiIndex(rows.map((r) => ({ ...r, kind: "node" as const })));

  const visibleSpaces = scopedToSpaces(actor);
  const spaceFilter =
    visibleSpaces !== null
      ? visibleSpaces.length
        ? inArray(sources.spaceId, visibleSpaces)
        : sql`false`
      : undefined;
  const sourceRows = await db
    .select({ id: sources.id, title: sources.title })
    .from(sources)
    .where(and(ne(sources.trustStatus, "archived"), spaceFilter));

  for (const s of sourceRows) {
    const key = normalizeTitle(s.title);
    if (!(key in nodeIndex)) {
      nodeIndex[key] = {
        id: s.id,
        title: s.title,
        verification: "source",
        kind: "source",
      };
    }
  }

  return nodeIndex;
}

// ---------------------------------------------------------------------------
// Version history (diff / revert backbone)
// ---------------------------------------------------------------------------

export async function listNodeVersions(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [node] = await db
    .select({ id: treeNodes.id, title: treeNodes.title, version: treeNodes.version })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(eq(treeNodes.id, nodeId), branchVisibilityCondition(actor)));
  if (!node) throw notFound();
  const versions = await db
    .select({
      seq: treeNodeVersions.seq,
      verification: treeNodeVersions.verification,
      changeSummary: treeNodeVersions.changeSummary,
      createdAt: treeNodeVersions.createdAt,
      authorName: users.displayName,
    })
    .from(treeNodeVersions)
    .innerJoin(users, eq(treeNodeVersions.createdBy, users.id))
    .where(eq(treeNodeVersions.nodeId, nodeId))
    .orderBy(desc(treeNodeVersions.seq));
  return { node, versions };
}

export async function getNodeVersion(actor: Principal, nodeId: string, seq: number) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [row] = await db
    .select({
      seq: treeNodeVersions.seq,
      contentMd: treeNodeVersions.contentMd,
      verification: treeNodeVersions.verification,
      changeSummary: treeNodeVersions.changeSummary,
      createdAt: treeNodeVersions.createdAt,
    })
    .from(treeNodeVersions)
    .innerJoin(treeNodes, eq(treeNodeVersions.nodeId, treeNodes.id))
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(
      and(
        eq(treeNodeVersions.nodeId, nodeId),
        eq(treeNodeVersions.seq, seq),
        branchVisibilityCondition(actor),
      ),
    );
  if (!row) throw notFound();
  return row;
}

/** A change proposal beside the node's current text, for the review surface. */
export async function getNodeChangeProposal(actor: Principal, proposalId: string) {
  authorize(actor, "knowledge.publish", { kind: "read" });
  const [row] = await db
    .select({
      proposal: nodeProposals,
      nodeTitle: treeNodes.title,
      nodeContentMd: treeNodes.contentMd,
      nodeVersion: treeNodes.version,
      authorName: users.displayName,
    })
    .from(nodeProposals)
    .innerJoin(treeNodes, eq(treeNodes.id, nodeProposals.nodeId))
    .innerJoin(users, eq(users.id, nodeProposals.createdBy))
    .where(and(eq(nodeProposals.kind, "change"), eq(nodeProposals.id, proposalId)));
  if (!row) throw notFound();
  return {
    ...row,
    canReview: actor.userId !== row.proposal.createdBy,
    stale: row.nodeVersion !== row.proposal.baseVersion,
  };
}
