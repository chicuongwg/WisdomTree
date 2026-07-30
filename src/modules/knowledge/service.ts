import { and, asc, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import {
  backlinkContext,
  buildWikiIndex,
  normalizeTitle,
  wikiTargetKeys,
} from "@/lib/wikilink";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { contentReviews, sources, sourceVersions } from "../storage/schema";
import { kickDispatch } from "../notify/dispatcher";
import {
  branches,
  nodeChangeProposals,
  nodeLinks,
  nodeTags,
  promotions,
  tags,
  treeNodes,
  treeNodeVersions,
  vaults,
} from "./schema";

// Module: knowledge — branches and tree nodes (curation→publish lives in
// storage/curation.ts because curations/markdown_drafts are storage tables).
// Every mutation follows the house rules: authorize() first, one
// db.transaction with recordAudit + emitOutbox inside, optimistic locking on
// versioned rows (WHERE id AND version, zero rows → 409).

const PAGE_SIZE = 20;

export type Verification = (typeof treeNodes.$inferSelect)["verification"];

function proposalSha256(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical);
    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, canonical(child)]),
      );
    }
    return item;
  };
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

/** Stable export/publish path: Vietnamese-safe slug, unique via numeric suffix. */
async function uniqueSlug(tx: Tx, title: string, excludeNodeId?: string): Promise<string> {
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
      .where(
        excludeNodeId
          ? and(eq(treeNodes.slug, candidate), ne(treeNodes.id, excludeNodeId))
          : eq(treeNodes.slug, candidate),
      );
    if (!taken) return candidate;
  }
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

/**
 * Knowledge scope & visibility rules:
 * - Every branch requires an explicit vault grant, including for admins.
 */
export function canViewBranch(
  actor: Principal,
  branch: { scope: string; vaultId: string },
): boolean {
  return actor.vaultIds?.includes(branch.vaultId) ?? false;
}

export function branchVisibilityCondition(actor: Principal) {
  const accessibleVaults = actor.vaultIds ?? [];
  return and(
    sql`${branches.archivedAt} IS NULL`,
    accessibleVaults.length ? inArray(branches.vaultId, accessibleVaults) : sql`false`,
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
  if (!branch || branch.archivedAt || !canViewBranch(actor, branch)) throw notFound();
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
  const isPersonalScope = input.scope === "personal";
  if (!isPersonalScope || actor.role !== "user") {
    throw new ApiError(403, "submission_required", "Chuyên đề chung phải bắt đầu từ đề xuất của user.");
  }
  return db.transaction(async (tx) => {
    const [vault] = await tx
      .select({ id: vaults.id })
      .from(vaults)
      .where(
        isPersonalScope
          ? and(eq(vaults.kind, "personal"), eq(vaults.ownerUserId, actor.userId))
          : eq(vaults.kind, "shared"),
      );
    if (!vault) throw new ApiError(409, "vault_missing", "Không tìm thấy kho tri thức.");
    const [created] = await tx
      .insert(branches)
      .values({
        vaultId: vault.id,
        name: input.name,
        description: input.description ?? null,
        scope: isPersonalScope ? "personal" : "team",
        ownerUserId: isPersonalScope ? actor.userId : null,
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

  const [tagRows, linkRows, backlinkRows, provenance] = await Promise.all([
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
// Node mutations
// ---------------------------------------------------------------------------

async function syncTags(tx: Tx, actor: Principal, nodeId: string, names: string[]) {
  await tx.delete(nodeTags).where(eq(nodeTags.nodeId, nodeId));
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const [existing] = await tx.select().from(tags).where(eq(tags.name, name));
    const tagId =
      existing?.id ??
      (await tx.insert(tags).values({ name, createdBy: actor.userId }).returning())[0].id;
    await tx.insert(nodeTags).values({ nodeId, tagId }).onConflictDoNothing();
  }
}

/**
 * Explicit link editor payload. Merge rule with the derived wiki-links:
 *
 *   link_type 'related' is the WIKI-LINK CHANNEL — it is owned by the node's
 *   content and reconciled by syncDerivedLinks on every save. The typed links
 *   ('supports' | 'contrasts' | 'part_of') are the EXPLICIT CHANNEL — they are
 *   declared in the editor and a content save never touches them.
 *
 * So this function deletes and rewrites only the typed rows; any 'related'
 * row it is handed is inserted idempotently but will be reconciled against
 * the content on the next save (a hand-declared 'related' link survives only
 * if the content also carries the wiki-link).
 */
async function syncLinks(
  tx: Tx,
  nodeId: string,
  links: Array<{ toNodeId: string; linkType: string }>,
) {
  await tx
    .delete(nodeLinks)
    .where(and(eq(nodeLinks.fromNodeId, nodeId), ne(nodeLinks.linkType, "related")));
  for (const link of links) {
    if (!["related", "supports", "contrasts", "part_of"].includes(link.linkType)) {
      throw new ApiError(400, "invalid_link_type", "Loại liên kết không hợp lệ.");
    }
    await tx
      .insert(nodeLinks)
      .values({
        fromNodeId: nodeId,
        toNodeId: link.toNodeId,
        linkType: link.linkType as (typeof nodeLinks.$inferInsert)["linkType"],
      })
      .onConflictDoNothing();
  }
}

/**
 * Wiki-links → node_links, inside the caller's transaction so a saved page
 * and its outgoing links can never disagree. Targets resolve by title,
 * case- and diacritic-insensitively (normalizeTitle mirrors the search
 * path's immutable_unaccent); unresolved targets and self-links write
 * nothing. Owns link_type 'related' entirely — see syncLinks for the rule.
 */
async function syncDerivedLinks(tx: Tx, nodeId: string, title: string, contentMd: string) {
  const keys = wikiTargetKeys(contentMd);
  let targetIds: string[] = [];
  if (keys.length) {
    const candidates = await tx
      .select({ id: treeNodes.id, title: treeNodes.title })
      .from(treeNodes)
      .where(ne(treeNodes.verification, "archived"));
    const index = buildWikiIndex(candidates);
    const selfKey = normalizeTitle(title);
    targetIds = [
      ...new Set(
        keys
          .filter((k) => k !== selfKey)
          .map((k) => index[k]?.id)
          .filter((id): id is string => Boolean(id) && id !== nodeId),
      ),
    ];
  }
  await tx
    .delete(nodeLinks)
    .where(
      and(
        eq(nodeLinks.fromNodeId, nodeId),
        eq(nodeLinks.linkType, "related"),
        targetIds.length ? notInArray(nodeLinks.toNodeId, targetIds) : sql`true`,
      ),
    );
  for (const toNodeId of targetIds) {
    await tx
      .insert(nodeLinks)
      .values({ fromNodeId: nodeId, toNodeId, linkType: "related" })
      .onConflictDoNothing();
  }
  return targetIds;
}

/** Manual node creation (Editor): enters `no_source` (state-machines.md). */
export async function createNode(
  actor: Principal,
  input: {
    branchId: string;
    title: string;
    contentMd: string;
    tags?: string[];
    links?: Array<{ toNodeId: string; linkType: string }>;
  },
) {
  const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId));
  if (!branch || branch.archivedAt) throw notFound();
  const isOwnPersonalBranch =
    branch.scope === "personal" &&
    (branch.ownerUserId === actor.userId || branch.createdBy === actor.userId);
  if (!isOwnPersonalBranch || actor.role !== "user") {
    throw new ApiError(403, "submission_required", "Nội dung chung phải đi qua maker-checker review.");
  }

  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, input.title);
    const [node] = await tx
      .insert(treeNodes)
      .values({
        branchId: input.branchId,
        title: input.title,
        slug,
        contentMd: input.contentMd,
        verification: "no_source",
        createdBy: actor.userId,
      })
      .returning();
    await tx.insert(treeNodeVersions).values({
      nodeId: node.id,
      seq: 1,
      contentMd: input.contentMd,
      verification: "no_source",
      createdBy: actor.userId,
      changeSummary: "Tạo trang thủ công",
    });
    if (input.tags) await syncTags(tx, actor, node.id, input.tags);
    if (input.links) await syncLinks(tx, node.id, input.links);
    // Same transaction as the node row: wiki-links in the content become
    // node_links or the save does not happen at all.
    await syncDerivedLinks(tx, node.id, input.title, input.contentMd);
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.create",
      targetType: "tree_node",
      targetId: node.id,
      details: { branchId: input.branchId, title: input.title },
    });
    return node;
  });
}

/**
 * Optimistic-locked node edit. Content changes append a tree_node_versions
 * snapshot. `verification` / `publish` are Admin/Op-only levers — the
 * verified→unverified downgrade is a distinct audited action
 * (state-machines.md § Node Verification, downgrade rule).
 */
export async function updateNode(
  actor: Principal,
  nodeId: string,
  patch: {
    title?: string;
    contentMd?: string;
    tags?: string[];
    links?: Array<{ toNodeId: string; linkType: string }>;
    verification?: Verification;
    publish?: boolean;
    expectedVersion?: number;
  },
) {
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (!node) throw notFound();
  const [branch] = await db.select().from(branches).where(eq(branches.id, node.branchId));
  const isOwnPersonalBranch =
    branch?.scope === "personal" &&
    (branch.ownerUserId === actor.userId || branch.createdBy === actor.userId);
  if (!isOwnPersonalBranch) {
    authorize(actor, "knowledge.node.edit", { ownerIds: [node.createdBy], kind: "write" });
    if (!branch) throw notFound();
    const grant = actor.vaultGrants?.find((item) => item.vaultId === branch.vaultId)?.grant;
    if (grant !== "editor" && grant !== "owner") throw notFound();
    if (patch.verification !== undefined || patch.publish !== undefined) {
      throw new ApiError(403, "review_required", "Mức thẩm định chỉ thay đổi qua review.");
    }
    const [currentTags, currentLinks] = await Promise.all([
      db
        .select({ name: tags.name })
        .from(nodeTags)
        .innerJoin(tags, eq(nodeTags.tagId, tags.id))
        .where(eq(nodeTags.nodeId, nodeId)),
      db
        .select({ toNodeId: nodeLinks.toNodeId, linkType: nodeLinks.linkType })
        .from(nodeLinks)
        .where(eq(nodeLinks.fromNodeId, nodeId)),
    ]);
    const snapshot = {
      title: patch.title ?? node.title,
      contentMd: patch.contentMd ?? node.contentMd,
      tags: [...(patch.tags ?? currentTags.map((tag) => tag.name))].sort(),
      links: [...(patch.links ?? currentLinks)].sort(
        (a, b) => a.toNodeId.localeCompare(b.toNodeId) || a.linkType.localeCompare(b.linkType),
      ),
    };
    return db.transaction(async (tx) => {
      const [proposal] = await tx
        .insert(nodeChangeProposals)
        .values({
          nodeId,
          baseVersion: patch.expectedVersion ?? node.version,
          ...snapshot,
          contentSha256: proposalSha256(snapshot),
          createdBy: actor.userId,
        })
        .returning();
      const [review] = await tx
        .insert(contentReviews)
        .values({
          targetType: "node_proposal",
          proposalId: proposal.id,
          contentSha256: proposal.contentSha256,
          originatorId: node.createdBy,
          lastEditorId: actor.userId,
          submittedBy: actor.userId,
          targetNodeId: nodeId,
        })
        .returning();
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "node.change.propose",
        targetType: "node_change_proposal",
        targetId: proposal.id,
        details: { nodeId, reviewId: review.id, baseVersion: proposal.baseVersion },
      });
      return { proposalId: proposal.id, reviewId: review.id, state: proposal.state };
    });
  }

  if (patch.verification !== undefined || patch.publish !== undefined) {
    // Verification transitions and the Quartz publish flag ride on
    // knowledge.publish (Admin/Op only, authorization-design.md note).
    authorize(actor, "knowledge.publish", { kind: "write" });
  }
  if (patch.verification !== undefined) {
    const allowed: Record<Verification, Verification[]> = {
      no_source: ["no_source", "unverified", "archived"],
      unverified: ["unverified", "verified", "archived"],
      verified: ["verified", "unverified", "archived"],
      archived: ["archived"],
    };
    if (!allowed[node.verification].includes(patch.verification)) {
      throw new ApiError(409, "invalid_state", "Chuyển trạng thái thẩm định không hợp lệ.");
    }
  }
  const nextVerification = patch.verification ?? node.verification;
  const nextPublish = patch.publish ?? node.publish;
  if (nextPublish && nextVerification !== "verified") {
    throw new ApiError(409, "invalid_state", "Chỉ trang Đã thẩm định mới được bật xuất bản.");
  }

  const expected = patch.expectedVersion ?? node.version;
  const contentChanged = patch.contentMd !== undefined && patch.contentMd !== node.contentMd;

  const result = await db.transaction(async (tx) => {
    const slug =
      patch.title !== undefined && patch.title !== node.title
        ? await uniqueSlug(tx, patch.title, nodeId)
        : node.slug;
    const [updated] = await tx
      .update(treeNodes)
      .set({
        ...(patch.title !== undefined ? { title: patch.title, slug } : {}),
        ...(patch.contentMd !== undefined ? { contentMd: patch.contentMd } : {}),
        verification: nextVerification,
        publish: nextPublish && nextVerification === "verified",
        updatedAt: new Date(),
        version: expected + 1,
      })
      .where(and(eq(treeNodes.id, nodeId), eq(treeNodes.version, expected)))
      .returning();
    if (!updated) throw versionConflict();

    if (contentChanged) {
      const [{ maxSeq }] = await tx
        .select({ maxSeq: sql<number>`coalesce(max(${treeNodeVersions.seq}), 0)::int` })
        .from(treeNodeVersions)
        .where(eq(treeNodeVersions.nodeId, nodeId));
      await tx.insert(treeNodeVersions).values({
        nodeId,
        seq: maxSeq + 1,
        contentMd: patch.contentMd!,
        verification: nextVerification,
        createdBy: actor.userId,
        changeSummary: "Cập nhật nội dung",
      });
    }
    // Derived wiki-links ride the same transaction as the node row (also on
    // a title-only change: the self-link guard keys off the title).
    if (patch.contentMd !== undefined || patch.title !== undefined) {
      await syncDerivedLinks(tx, nodeId, updated.title, updated.contentMd);
    }
    await recordAudit(tx, actor, {
      accountability: actor.role === "admin_op" ? "approver_publisher" : "editor_updater",
      action: "node.update",
      targetType: "tree_node",
      targetId: nodeId,
      details: { contentChanged, from: node.version, to: expected + 1 },
    });
    if (patch.verification !== undefined && patch.verification !== node.verification) {
      // The downgrade rule: auditable Admin/Op action with old/new values.
      await recordAudit(tx, actor, {
        accountability: "approver_publisher",
        action:
          node.verification === "verified" && patch.verification === "unverified"
            ? "node.verification.downgrade"
            : "node.verification.change",
        targetType: "tree_node",
        targetId: nodeId,
        details: { from: node.verification, to: patch.verification },
      });
    }
    return updated;
  });

  // Tags/links sync after the lock check (separate rows, no version column).
  if (patch.tags || patch.links) {
    await db.transaction(async (tx) => {
      if (patch.tags) await syncTags(tx, actor, nodeId, patch.tags);
      if (patch.links) await syncLinks(tx, nodeId, patch.links);
    });
  }
  return result;
}

export async function reviewNodeProposal(
  actor: Principal,
  nodeId: string,
  proposalId: string,
  input: {
    decision: "approved" | "rejected" | "changes_requested";
    verification?: "unverified" | "verified";
    expectedReviewVersion: number;
  },
) {
  authorize(actor, "knowledge.publish", { kind: "write" });
  const [row] = await db
    .select({
      proposal: nodeChangeProposals,
      review: contentReviews,
      node: treeNodes,
      vaultId: branches.vaultId,
    })
    .from(nodeChangeProposals)
    .innerJoin(contentReviews, eq(contentReviews.proposalId, nodeChangeProposals.id))
    .innerJoin(treeNodes, eq(treeNodes.id, nodeChangeProposals.nodeId))
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(
      and(eq(nodeChangeProposals.id, proposalId), eq(nodeChangeProposals.nodeId, nodeId)),
    );
  if (!row || row.review.state !== "pending" || row.proposal.state !== "pending") throw notFound();
  const grant = actor.vaultGrants?.find((item) => item.vaultId === row.vaultId)?.grant;
  if (grant !== "reviewer" && grant !== "owner") throw notFound();
  if (
    [row.review.originatorId, row.review.lastEditorId, row.review.submittedBy].includes(actor.userId)
  ) {
    throw new ApiError(403, "separation_of_duties", "Người tạo hoặc sửa không được tự duyệt.");
  }
  if (proposalSha256({
    title: row.proposal.title,
    contentMd: row.proposal.contentMd,
    tags: row.proposal.tags,
    links: row.proposal.links,
  }) !== row.review.contentSha256) {
    throw new ApiError(409, "review_stale", "Proposal không còn khớp review snapshot.");
  }

  return db.transaction(async (tx) => {
    if (input.decision !== "approved") {
      await tx
        .update(nodeChangeProposals)
        .set({ state: input.decision })
        .where(eq(nodeChangeProposals.id, proposalId));
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
          ),
        )
        .returning();
      if (!review) throw versionConflict();
      return { state: review.state };
    }
    if (!input.verification) throw new ApiError(400, "missing_verification", "Thiếu mức thẩm định.");
    const [node] = await tx
      .update(treeNodes)
      .set({
        title: row.proposal.title,
        contentMd: row.proposal.contentMd,
        verification: input.verification,
        publish: input.verification === "verified",
        updatedAt: new Date(),
        version: row.node.version + 1,
      })
      .where(
        and(
          eq(treeNodes.id, nodeId),
          eq(treeNodes.version, row.proposal.baseVersion),
          eq(treeNodes.version, row.node.version),
        ),
      )
      .returning();
    if (!node) throw versionConflict();
    const [{ maxSeq }] = await tx
      .select({ maxSeq: sql<number>`coalesce(max(${treeNodeVersions.seq}), 0)::int` })
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, nodeId));
    const [version] = await tx
      .insert(treeNodeVersions)
      .values({
        nodeId,
        seq: maxSeq + 1,
        contentMd: node.contentMd,
        verification: input.verification,
        createdBy: row.proposal.createdBy,
        changeSummary: "Approved maker-checker proposal",
        reviewStatus: "approved",
      })
      .returning();
    await syncTags(tx, actor, nodeId, row.proposal.tags as string[]);
    await syncLinks(
      tx,
      nodeId,
      row.proposal.links as Array<{ toNodeId: string; linkType: string }>,
    );
    await syncDerivedLinks(tx, nodeId, node.title, node.contentMd);
    await tx
      .update(nodeChangeProposals)
      .set({ state: "approved" })
      .where(eq(nodeChangeProposals.id, proposalId));
    const [review] = await tx
      .update(contentReviews)
      .set({
        state: "approved",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        verification: input.verification,
        approvedNodeVersionId: version.id,
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
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.change.approve",
      targetType: "tree_node",
      targetId: nodeId,
      details: { proposalId, reviewId: review.id, nodeVersionId: version.id },
    });
    return node;
  });
}

export async function archiveNode(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.archive", { kind: "write" });
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (!node) throw notFound();
  if (node.verification === "archived") return node;

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(treeNodes)
      .set({
        verification: "archived",
        publish: false,
        updatedAt: new Date(),
        version: node.version + 1,
      })
      .where(and(eq(treeNodes.id, nodeId), eq(treeNodes.version, node.version)))
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.archive",
      targetType: "tree_node",
      targetId: nodeId,
      details: { from: node.verification },
    });
    await emitOutbox(tx, "tree.node.archived", { nodeId, branchId: node.branchId });
    return updated;
  });
  kickDispatch();
  return result;
}

/**
 * Retire a finished branch. `branches.archived_at` has been in the schema
 * since 0001 and every read already skips a branch that has it set — there was
 * simply no way to set it, so a finished subject stayed on the list forever
 * beside the live ones (owner decision 2026-07-21).
 *
 * Archiving hides the branch, NOT its pages: an archived branch's nodes keep
 * their own verification state and their published files, because a subject
 * being finished is the opposite of its findings being withdrawn. Setting the
 * timestamp again is a no-op rather than an error, so a double-click on a slow
 * connection cannot produce a conflict a person has to think about.
 */
export async function archiveBranch(actor: Principal, branchId: string) {
  authorize(actor, "knowledge.archive", { kind: "write" });
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
  if (!branch) throw notFound();
  if (branch.archivedAt) return branch;

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(branches)
      .set({ archivedAt: new Date(), updatedAt: new Date(), version: branch.version + 1 })
      .where(and(eq(branches.id, branchId), eq(branches.version, branch.version)))
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "branch.archive",
      targetType: "branch",
      targetId: branchId,
      details: { name: branch.name },
    });
    return updated;
  });
}

/** Merge: this node archives and redirects to the canonical node (audited). */
export async function mergeNode(actor: Principal, nodeId: string, canonicalNodeId: string) {
  authorize(actor, "knowledge.node.merge", { kind: "write" });
  if (nodeId === canonicalNodeId) {
    throw new ApiError(400, "invalid_merge", "Không thể gộp một trang vào chính nó.");
  }
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  const [canonical] = await db.select().from(treeNodes).where(eq(treeNodes.id, canonicalNodeId));
  if (!node || !canonical) throw notFound();
  if (canonical.verification === "archived") {
    throw new ApiError(409, "invalid_state", "Trang chuẩn không được ở trạng thái lưu trữ.");
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(treeNodes)
      .set({
        verification: "archived",
        publish: false,
        canonicalNodeId,
        updatedAt: new Date(),
        version: node.version + 1,
      })
      .where(and(eq(treeNodes.id, nodeId), eq(treeNodes.version, node.version)))
      .returning();
    if (!updated) throw versionConflict();
    // Incoming links now point at the canonical node.
    await tx.delete(nodeLinks).where(eq(nodeLinks.fromNodeId, nodeId));
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.merge",
      targetType: "tree_node",
      targetId: nodeId,
      details: { canonicalNodeId },
    });
    await emitOutbox(tx, "tree.node.merged", { nodeId, canonicalNodeId, branchId: node.branchId });
    return updated;
  });
  kickDispatch();
  return result;
}

/** Editors resolve node/branch titles for pickers. */
export async function listNodeOptions(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({ id: treeNodes.id, title: treeNodes.title, verification: treeNodes.verification })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(
      and(
        inArray(treeNodes.verification, ["no_source", "unverified", "verified"]),
        branchVisibilityCondition(actor),
      ),
    )
    .orderBy(asc(treeNodes.title));
}
