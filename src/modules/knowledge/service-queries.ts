import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { backlinkContext, buildWikiIndex, normalizeTitle } from "@/lib/wikilink";
import type { Principal } from "../auth/principal";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { requireProjectResearchRead } from "../auth/core";
import { recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { projects } from "../project/schema";
import { sources, sourceVersions, spaces } from "../storage/schema";
import {
  branches,
  nodeProposals,
  nodeTranslations,
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
  const visibleSpaces = scopedToSpaces(actor);
  const visibleTeam =
    visibleSpaces === null
      ? eq(branches.scope, "team")
      : visibleSpaces.length
        ? and(eq(branches.scope, "team"), inArray(branches.spaceId, visibleSpaces))
        : sql`false`;
  return and(
    sql`${branches.archivedAt} IS NULL`,
    or(visibleTeam, eq(branches.ownerUserId, actor.userId)),
  );
}

export async function listBranches(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({
      id: branches.id,
      spaceId: branches.spaceId,
      parentId: branches.parentId,
      sortOrder: branches.sortOrder,
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
    .orderBy(asc(branches.sortOrder), asc(branches.name));
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
      spaceId: branches.spaceId,
      parentId: branches.parentId,
      sortOrder: branches.sortOrder,
      name: branches.name,
      scope: branches.scope,
      ownerUserId: branches.ownerUserId,
    })
    .from(branches)
    .where(branchVisibilityCondition(actor))
    .orderBy(asc(branches.sortOrder), asc(branches.name));
  const nodeRows = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      slug: treeNodes.slug,
      sortOrder: treeNodes.sortOrder,
      branchId: treeNodes.branchId,
      verification: treeNodes.verification,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(ne(treeNodes.verification, "archived"), branchVisibilityCondition(actor)))
    .orderBy(asc(treeNodes.sortOrder), asc(treeNodes.title));
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
  const [branch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.id, branchId), branchVisibilityCondition(actor)));
  if (!branch) throw notFound();
  const nodes = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      slug: treeNodes.slug,
      summary: treeNodes.summary,
      sortOrder: treeNodes.sortOrder,
      verification: treeNodes.verification,
      publish: treeNodes.publish,
      updatedAt: treeNodes.updatedAt,
    })
    .from(treeNodes)
    .where(and(eq(treeNodes.branchId, branchId), ne(treeNodes.verification, "archived")))
    .orderBy(asc(treeNodes.sortOrder), asc(treeNodes.title));
  return { ...branch, nodes };
}

export async function createBranch(
  actor: Principal,
  input: {
    name: string;
    description?: string;
    scope?: string;
    spaceId?: string;
    parentId?: string | null;
    sortOrder?: number;
  },
) {
  const personal = input.scope === "personal";
  if (personal) {
    authorize(actor, "knowledge.branch.create", { ownerIds: [actor.userId], kind: "write" });
  } else {
    if (!input.spaceId) {
      throw new ApiError(400, "space_required", "A team branch requires a space.");
    }
    authorize(actor, "knowledge.branch.manage", { spaceId: input.spaceId, kind: "write" });
  }
  await assertValidBranchParent({
    branchId: null,
    parentId: input.parentId ?? null,
    scope: personal ? "personal" : "team",
    spaceId: personal ? null : input.spaceId!,
    ownerUserId: personal ? actor.userId : null,
  });
  return db.transaction(async (tx) => {
    const [dup] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(
        personal
          ? and(
              eq(branches.scope, "personal"),
              eq(branches.ownerUserId, actor.userId),
              eq(branches.name, input.name),
            )
          : and(
              eq(branches.scope, "team"),
              eq(branches.spaceId, input.spaceId!),
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
        scope: personal ? "personal" : "team",
        spaceId: personal ? null : input.spaceId!,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
        ownerUserId: personal ? actor.userId : null,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "branch.create",
      targetType: "branch",
      targetId: created.id,
      details: {
        name: input.name,
        spaceId: input.spaceId ?? null,
        parentId: input.parentId ?? null,
      },
    });
    return created;
  });
}

export async function updateBranch(
  actor: Principal,
  branchId: string,
  patch: {
    name?: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
    expectedVersion?: number;
  },
) {
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
  if (!branch) throw notFound();
  if (branch.scope === "personal") {
    authorize(actor, "knowledge.branch.edit", {
      ownerIds: [branch.ownerUserId, branch.createdBy],
      kind: "write",
    });
  } else {
    authorize(actor, "knowledge.branch.manage", { spaceId: branch.spaceId!, kind: "write" });
  }
  if (patch.parentId !== undefined) {
    await assertValidBranchParent({
      branchId,
      parentId: patch.parentId,
      scope: branch.scope,
      spaceId: branch.spaceId,
      ownerUserId: branch.ownerUserId,
    });
  }
  const expected = patch.expectedVersion ?? branch.version;
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(branches)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.parentId !== undefined ? { parentId: patch.parentId } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
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
      details: { name: patch.name, parentId: patch.parentId, sortOrder: patch.sortOrder },
    });
    return updated;
  });
}

async function assertValidBranchParent(input: {
  branchId: string | null;
  parentId: string | null;
  scope: string;
  spaceId: string | null;
  ownerUserId: string | null;
}) {
  if (!input.parentId) return;
  if (input.parentId === input.branchId) {
    throw new ApiError(400, "invalid_branch_parent", "A branch cannot contain itself.");
  }
  const [parent] = await db.select().from(branches).where(eq(branches.id, input.parentId));
  if (
    !parent ||
    parent.archivedAt ||
    parent.scope !== input.scope ||
    parent.spaceId !== input.spaceId ||
    parent.ownerUserId !== input.ownerUserId
  ) {
    throw new ApiError(
      400,
      "invalid_branch_parent",
      "The parent branch must use the same knowledge scope.",
    );
  }
  const seen = new Set<string>();
  let cursor: string | null = parent.id;
  while (cursor) {
    if (cursor === input.branchId) {
      throw new ApiError(
        400,
        "invalid_branch_parent",
        "A branch hierarchy cannot contain a cycle.",
      );
    }
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const [row] = await db
      .select({ parentId: branches.parentId })
      .from(branches)
      .where(eq(branches.id, cursor));
    cursor = row?.parentId ?? null;
  }
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

export async function searchKnowledge(actor: Principal, q: string, spaceId?: string) {
  authorize(actor, "knowledge.search", { kind: "read" });
  const query = q.trim();
  if (!query) return [];
  if (spaceId) authorize(actor, "knowledge.space.read", { spaceId, kind: "read" });
  const visibleSpaces = scopedToSpaces(actor);
  const sourceScope = spaceId
    ? eq(sources.spaceId, spaceId)
    : visibleSpaces === null
      ? undefined
      : visibleSpaces.length
        ? inArray(sources.spaceId, visibleSpaces)
        : sql`false`;
  const nodeScope = spaceId ? eq(branches.spaceId, spaceId) : branchVisibilityCondition(actor);
  const [nodes, translatedNodes, sourceRows] = await Promise.all([
    db
      .select({
        kind: sql<"node">`'node'`,
        id: treeNodes.id,
        title: treeNodes.title,
        slug: treeNodes.slug,
        context: branches.name,
        verification: treeNodes.verification,
      })
      .from(treeNodes)
      .innerJoin(branches, eq(branches.id, treeNodes.branchId))
      .where(
        and(
          ne(treeNodes.verification, "archived"),
          nodeScope,
          sql`${treeNodes}.tsv @@ plainto_tsquery('simple', immutable_unaccent(${query}))`,
        ),
      )
      .orderBy(
        sql`ts_rank(${treeNodes}.tsv, plainto_tsquery('simple', immutable_unaccent(${query}))) DESC`,
      )
      .limit(12),
    db
      .select({
        kind: sql<"node">`'node'`,
        id: treeNodes.id,
        title: nodeTranslations.title,
        slug: treeNodes.slug,
        context: sql<string>`${branches.name} || ' · EN'`,
        verification: treeNodes.verification,
      })
      .from(nodeTranslations)
      .innerJoin(treeNodes, eq(treeNodes.id, nodeTranslations.nodeId))
      .innerJoin(branches, eq(branches.id, treeNodes.branchId))
      .where(
        and(
          ne(treeNodes.verification, "archived"),
          nodeScope,
          or(
            ilike(nodeTranslations.title, `%${query}%`),
            ilike(nodeTranslations.summary, `%${query}%`),
            ilike(nodeTranslations.contentMd, `%${query}%`),
          ),
        ),
      )
      .orderBy(asc(nodeTranslations.title))
      .limit(12),
    db
      .select({
        kind: sql<"source">`'source'`,
        id: sources.id,
        title: sources.title,
        slug: sql<string | null>`null`,
        context: spaces.name,
        verification: sources.trustStatus,
      })
      .from(sources)
      .innerJoin(spaces, eq(spaces.id, sources.spaceId))
      .where(
        and(
          ne(sources.trustStatus, "archived"),
          sourceScope,
          or(ilike(sources.title, `%${query}%`), ilike(sources.description, `%${query}%`)),
        ),
      )
      .orderBy(asc(sources.title))
      .limit(12),
  ]);
  const nodeIds = new Set(nodes.map((node) => node.id));
  return [...nodes, ...translatedNodes.filter((node) => !nodeIds.has(node.id)), ...sourceRows];
}

export async function getNode(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [row] = await db
    .select({
      node: treeNodes,
      branchName: branches.name,
      branchScope: branches.scope,
      branchSpaceId: branches.spaceId,
      branchOwnerId: branches.ownerUserId,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(eq(treeNodes.id, nodeId), branchVisibilityCondition(actor)));
  if (!row) throw notFound();
  const visibleSpaces = scopedToSpaces(actor);

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
        projectId: treeNodes.projectId,
      })
      .from(nodeLinks)
      .innerJoin(treeNodes, eq(nodeLinks.toNodeId, treeNodes.id))
      .innerJoin(branches, eq(treeNodes.branchId, branches.id))
      .where(and(eq(nodeLinks.fromNodeId, nodeId), branchVisibilityCondition(actor))),
    // Backlinks — the incoming half of the graph (WHERE to_node_id = :id).
    // Kept apart from provenance on purpose: provenance answers "what source
    // backs this page", backlinks answer "which pages point here".
    db
      .select({
        fromNodeId: nodeLinks.fromNodeId,
        linkType: nodeLinks.linkType,
        title: treeNodes.title,
        projectId: treeNodes.projectId,
        contentMd: treeNodes.contentMd,
        verification: treeNodes.verification,
      })
      .from(nodeLinks)
      .innerJoin(treeNodes, eq(nodeLinks.fromNodeId, treeNodes.id))
      .innerJoin(branches, eq(treeNodes.branchId, branches.id))
      .where(
        and(
          eq(nodeLinks.toNodeId, nodeId),
          ne(treeNodes.verification, "archived"),
          branchVisibilityCondition(actor),
        ),
      )
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
      .where(
        and(
          eq(treeNodeVersions.nodeId, nodeId),
          visibleSpaces === null
            ? undefined
            : visibleSpaces.length
              ? inArray(sources.spaceId, visibleSpaces)
              : sql`false`,
        ),
      )
      .orderBy(desc(promotions.createdAt)),
    db
      .select({
        sourceNodeId: nodeProposals.nodeId,
        sourceTitle: nodeProposals.title,
        approvedByName: users.displayName,
        reviewedAt: nodeProposals.updatedAt,
      })
      .from(nodeProposals)
      .innerJoin(treeNodeVersions, eq(nodeProposals.approvedNodeVersionId, treeNodeVersions.id))
      .innerJoin(users, eq(nodeProposals.decidedBy, users.id))
      .where(
        and(
          eq(nodeProposals.kind, "publication"),
          eq(treeNodeVersions.nodeId, nodeId),
          eq(nodeProposals.createdBy, actor.userId),
        ),
      ),
  ]);

  return {
    ...row.node,
    branchName: row.branchName,
    branchScope: row.branchScope,
    branchSpaceId: row.branchSpaceId,
    branchOwnerId: row.branchOwnerId,
    tags: tagRows.map((t) => t.name),
    links: linkRows,
    backlinks: backlinkRows.map((b) => ({
      fromNodeId: b.fromNodeId,
      linkType: b.linkType,
      title: b.title,
      projectId: b.projectId,
      verification: b.verification,
      // The sentence around the wiki-link when it is derivable, else the
      // source page's opening line.
      context: backlinkContext(b.contentMd, normalizeTitle(row.node.title)),
    })),
    provenance,
    personalOrigins,
  };
}

export async function getNodeNavigation(actor: Principal, nodeId: string) {
  const node = await getNode(actor, nodeId);
  const rows = await db
    .select({ id: treeNodes.id, title: treeNodes.title, slug: treeNodes.slug })
    .from(treeNodes)
    .where(and(eq(treeNodes.branchId, node.branchId), ne(treeNodes.verification, "archived")))
    .orderBy(asc(treeNodes.sortOrder), asc(treeNodes.title));
  const at = rows.findIndex((row) => row.id === nodeId);
  return {
    previous: at > 0 ? rows[at - 1] : null,
    next: at >= 0 && at < rows.length - 1 ? rows[at + 1] : null,
  };
}

/** Title → node index used to resolve `[[wiki-links]]` while rendering. */
export async function wikiIndex(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const rows = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      slug: treeNodes.slug,
      contentMd: treeNodes.contentMd,
      verification: treeNodes.verification,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(ne(treeNodes.verification, "archived"), branchVisibilityCondition(actor)))
    .orderBy(asc(treeNodes.updatedAt));
  const nodeIndex: Record<
    string,
    {
      id: string;
      title: string;
      slug?: string;
      contentMd?: string;
      verification: string;
      kind: "node" | "source";
    }
  > = buildWikiIndex(rows.map((r) => ({ ...r, kind: "node" as const })));
  const translationRows = await db
    .select({
      id: treeNodes.id,
      title: nodeTranslations.title,
      slug: treeNodes.slug,
      contentMd: nodeTranslations.contentMd,
      verification: treeNodes.verification,
    })
    .from(nodeTranslations)
    .innerJoin(treeNodes, eq(treeNodes.id, nodeTranslations.nodeId))
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(and(ne(treeNodes.verification, "archived"), branchVisibilityCondition(actor)));
  for (const translation of translationRows) {
    const key = normalizeTitle(translation.title);
    if (!(key in nodeIndex)) nodeIndex[key] = { ...translation, kind: "node" };
  }

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
      snapshotComplete: treeNodeVersions.snapshotComplete,
      supportSnapshotComplete: treeNodeVersions.supportSnapshotComplete,
      createdAt: treeNodeVersions.createdAt,
      authorName: users.displayName,
    })
    .from(treeNodeVersions)
    .innerJoin(users, eq(treeNodeVersions.createdBy, users.id))
    .where(eq(treeNodeVersions.nodeId, nodeId))
    .orderBy(desc(treeNodeVersions.seq));
  return { node, versions };
}

/**
 * List exact immutable official versions for an authorized Project Note.
 * Excludes private drafts, legacy Personal nodes, and translation drafts.
 */
export async function listProjectNoteVersions(actor: Principal, nodeId: string) {
  const [node] = await db
    .select({ id: treeNodes.id, projectId: treeNodes.projectId })
    .from(treeNodes)
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .where(and(eq(treeNodes.id, nodeId), ne(treeNodes.verification, "archived")));
  if (!node || !node.projectId) throw notFound();
  await requireProjectResearchRead(actor, node.projectId);

  return db
    .select({
      id: treeNodeVersions.id,
      seq: treeNodeVersions.seq,
      title: treeNodeVersions.title,
      supportSnapshotComplete: treeNodeVersions.supportSnapshotComplete,
      createdAt: treeNodeVersions.createdAt,
    })
    .from(treeNodeVersions)
    .where(and(eq(treeNodeVersions.nodeId, nodeId), ne(treeNodeVersions.verification, "archived")))
    .orderBy(desc(treeNodeVersions.seq));
}

export async function getNodeVersion(actor: Principal, nodeId: string, seq: number) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [row] = await db
    .select({
      seq: treeNodeVersions.seq,
      contentMd: treeNodeVersions.contentMd,
      verification: treeNodeVersions.verification,
      changeSummary: treeNodeVersions.changeSummary,
      title: treeNodeVersions.title,
      summary: treeNodeVersions.summary,
      sortOrder: treeNodeVersions.sortOrder,
      tags: treeNodeVersions.tags,
      links: treeNodeVersions.links,
      publish: treeNodeVersions.publish,
      reviewRequired: treeNodeVersions.reviewRequired,
      snapshotComplete: treeNodeVersions.snapshotComplete,
      supportSnapshotComplete: treeNodeVersions.supportSnapshotComplete,
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
  authorize(actor, "knowledge.review.list", { kind: "read" });
  const [row] = await db
    .select({
      proposal: nodeProposals,
      nodeTitle: treeNodes.title,
      nodeContentMd: treeNodes.contentMd,
      nodeVersion: treeNodes.version,
      authorName: users.displayName,
      spaceId: branches.spaceId,
    })
    .from(nodeProposals)
    .innerJoin(treeNodes, eq(treeNodes.id, nodeProposals.nodeId))
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .innerJoin(users, eq(users.id, nodeProposals.createdBy))
    .where(and(eq(nodeProposals.kind, "change"), eq(nodeProposals.id, proposalId)));
  if (!row) throw notFound();
  authorize(actor, "knowledge.publish", { spaceId: row.spaceId ?? undefined, kind: "read" });
  return {
    ...row,
    canReview: actor.userId !== row.proposal.createdBy,
    stale: row.nodeVersion !== row.proposal.baseVersion,
  };
}
