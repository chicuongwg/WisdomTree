import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
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

  const [tagRows, linkRows, provenance] = await Promise.all([
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
    provenance,
  };
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

async function syncLinks(
  tx: Tx,
  nodeId: string,
  links: Array<{ toNodeId: string; linkType: string }>,
) {
  await tx.delete(nodeLinks).where(eq(nodeLinks.fromNodeId, nodeId));
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
