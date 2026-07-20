import { and, asc, desc, eq, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import {
  backlinkContext,
  buildWikiIndex,
  excerpt,
  normalizeTitle,
  wikiTargetKeys,
} from "@/lib/wikilink";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { sources, sourceVersions } from "../storage/schema";
import { dispatchOutbox } from "../notify/dispatcher";
import {
  branches,
  nodeLinks,
  nodeTags,
  promotions,
  tags,
  treeNodes,
  treeNodeVersions,
} from "./schema";

// Module: knowledge — branches and tree nodes (curation→publish lives in
// storage/curation.ts because curations/markdown_drafts are storage tables).
// Every mutation follows the house rules: authorize() first, one
// db.transaction with recordAudit + emitOutbox inside, optimistic locking on
// versioned rows (WHERE id AND version, zero rows → 409).

const PAGE_SIZE = 20;

export type Verification = (typeof treeNodes.$inferSelect)["verification"];

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

export async function listBranches(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({
      id: branches.id,
      name: branches.name,
      description: branches.description,
      createdBy: branches.createdBy,
      updatedAt: branches.updatedAt,
      version: branches.version,
      nodeCount: sql<number>`count(${treeNodes.id}) FILTER (WHERE ${treeNodes.verification} <> 'archived')::int`,
      verifiedCount: sql<number>`count(${treeNodes.id}) FILTER (WHERE ${treeNodes.verification} = 'verified')::int`,
    })
    .from(branches)
    .leftJoin(treeNodes, eq(treeNodes.branchId, branches.id))
    .where(sql`${branches.archivedAt} IS NULL`)
    .groupBy(branches.id)
    .orderBy(asc(branches.name));
}

/** Shell sidebar: every live branch with its node list, two queries total. */
export async function treeOutline(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const branchRows = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(sql`${branches.archivedAt} IS NULL`)
    .orderBy(asc(branches.name));
  const nodeRows = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      branchId: treeNodes.branchId,
      verification: treeNodes.verification,
    })
    .from(treeNodes)
    .where(ne(treeNodes.verification, "archived"))
    .orderBy(asc(treeNodes.title));
  return branchRows.map((b) => ({
    ...b,
    nodes: nodeRows.filter((n) => n.branchId === b.id),
  }));
}

export async function getBranch(actor: Principal, branchId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
  if (!branch || branch.archivedAt) throw notFound();
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
  input: { name: string; description?: string },
) {
  authorize(actor, "knowledge.branch.create", { kind: "write" });
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(branches)
      .values({ name: input.name, description: input.description ?? null, createdBy: actor.userId })
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
    .where(ne(treeNodes.verification, "archived"))
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
        sql`${treeNodes}.tsv @@ plainto_tsquery('simple', immutable_unaccent(${query}))`,
      ),
    )
    .orderBy(sql`ts_rank(${treeNodes}.tsv, plainto_tsquery('simple', immutable_unaccent(${query}))) DESC`)
    .limit(PAGE_SIZE)
    .offset((Math.max(1, page) - 1) * PAGE_SIZE);
}

export async function getNode(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [row] = await db
    .select({ node: treeNodes, branchName: branches.name })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(eq(treeNodes.id, nodeId));
  if (!row) throw notFound();

  const [tagRows, linkRows, backlinkRows, provenance] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(nodeTags)
      .innerJoin(tags, eq(nodeTags.tagId, tags.id))
      .where(eq(nodeTags.nodeId, nodeId)),
    db
      .select({ toNodeId: nodeLinks.toNodeId, linkType: nodeLinks.linkType, title: treeNodes.title })
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

/** Hover/focus preview payload: title, verification, ~200 chars of content. */
export async function nodePreview(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [node] = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      verification: treeNodes.verification,
      contentMd: treeNodes.contentMd,
    })
    .from(treeNodes)
    .where(eq(treeNodes.id, nodeId));
  if (!node) throw notFound();
  return {
    id: node.id,
    title: node.title,
    verification: node.verification,
    excerpt: excerpt(node.contentMd, 200),
  };
}

/** Title → node index used to resolve `[[wiki-links]]` while rendering. */
export async function wikiIndex(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const rows = await db
    .select({ id: treeNodes.id, title: treeNodes.title, verification: treeNodes.verification })
    .from(treeNodes)
    .where(ne(treeNodes.verification, "archived"))
    .orderBy(asc(treeNodes.updatedAt));
  return buildWikiIndex(rows);
}

// ---------------------------------------------------------------------------
// Graph Explorer (screen-inventory.md) — nodes + edges for the map surface
// ---------------------------------------------------------------------------

export type GraphNode = {
  id: string;
  title: string;
  branchId: string;
  branchName: string;
  verification: string;
};
export type GraphEdge = { from: string; to: string; linkType: string };
export type KnowledgeGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

/** Whole live graph: every non-archived page and every link between two. */
export async function knowledgeGraph(actor: Principal): Promise<KnowledgeGraph> {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const nodes = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      branchId: treeNodes.branchId,
      branchName: branches.name,
      verification: treeNodes.verification,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(ne(treeNodes.verification, "archived"))
    .orderBy(asc(treeNodes.title));
  const live = new Set(nodes.map((n) => n.id));
  const edgeRows = await db
    .select({
      from: nodeLinks.fromNodeId,
      to: nodeLinks.toNodeId,
      linkType: nodeLinks.linkType,
    })
    .from(nodeLinks);
  return { nodes, edges: edgeRows.filter((e) => live.has(e.from) && live.has(e.to)) };
}

/** How many hops the local map may ever ask for — matches DEPTH_RANGE.max in graph-settings.ts. */
export const MAX_LOCAL_DEPTH = 3;

/**
 * Local map on Node Detail: the page plus its neighbours out to `depth` hops.
 *
 * `depth` defaults to 1, so every pre-existing caller issues exactly the same
 * single edge query it always did. The Node Detail page asks for the maximum
 * the display panel offers, and the client narrows to the reader's chosen
 * depth without another round trip.
 */
export async function neighbourGraph(
  actor: Principal,
  nodeId: string,
  depth = 1,
): Promise<KnowledgeGraph> {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  const [self] = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      branchId: treeNodes.branchId,
      branchName: branches.name,
      verification: treeNodes.verification,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(eq(treeNodes.id, nodeId));
  if (!self) throw notFound();

  const hops = Math.max(1, Math.min(MAX_LOCAL_DEPTH, Math.trunc(depth) || 1));
  const seen = new Set<string>([nodeId]);
  const edgeKeys = new Set<string>();
  const incident: GraphEdge[] = [];
  let frontier: string[] = [nodeId];
  for (let step = 0; step < hops && frontier.length > 0; step++) {
    const rows = await db
      .select({ from: nodeLinks.fromNodeId, to: nodeLinks.toNodeId, linkType: nodeLinks.linkType })
      .from(nodeLinks)
      .where(
        or(inArray(nodeLinks.fromNodeId, frontier), inArray(nodeLinks.toNodeId, frontier)),
      );
    const next: string[] = [];
    for (const e of rows) {
      const key = `${e.from}|${e.to}|${e.linkType}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        incident.push(e);
      }
      for (const side of [e.from, e.to]) {
        if (seen.has(side)) continue;
        seen.add(side);
        next.push(side);
      }
    }
    frontier = next;
  }
  const ids = [...seen];
  const nodes = await db
    .select({
      id: treeNodes.id,
      title: treeNodes.title,
      branchId: treeNodes.branchId,
      branchName: branches.name,
      verification: treeNodes.verification,
    })
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(inArray(treeNodes.id, ids), ne(treeNodes.verification, "archived")))
    .orderBy(asc(treeNodes.title));
  const live = new Set(nodes.map((n) => n.id));
  if (!live.has(nodeId)) nodes.unshift(self); // an archived page still maps itself
  live.add(nodeId);
  return { nodes, edges: incident.filter((e) => live.has(e.from) && live.has(e.to)) };
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
  authorize(actor, "knowledge.node.create", { kind: "write" });
  const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId));
  if (!branch || branch.archivedAt) throw notFound();

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
  authorize(actor, "knowledge.node.edit", { ownerIds: [node.createdBy], kind: "write" });

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

export async function archiveNode(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.archive", { kind: "write" });
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (!node) throw notFound();
  if (node.verification === "archived") return node;

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(treeNodes)
      .set({ verification: "archived", publish: false, updatedAt: new Date(), version: node.version + 1 })
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
  void dispatchOutbox();
  return result;
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
  void dispatchOutbox();
  return result;
}

/** Editors resolve node/branch titles for pickers. */
export async function listNodeOptions(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({ id: treeNodes.id, title: treeNodes.title, verification: treeNodes.verification })
    .from(treeNodes)
    .where(inArray(treeNodes.verification, ["no_source", "unverified", "verified"]))
    .orderBy(asc(treeNodes.title));
}
