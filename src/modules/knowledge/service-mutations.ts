import { and, asc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { buildWikiIndex, normalizeTitle, wikiTargetKeys } from "@/lib/wikilink";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { assertIndependentReviewer } from "../auth/maker-checker";
import { assertNotLockedByOther } from "./edit-lock";
import { emitOutbox, recordAudit } from "../audit/service";
import { kickDispatch } from "../notify/dispatcher";
import {
  branches,
  nodeChangeProposals,
  nodeLinks,
  nodeTags,
  tags,
  treeNodes,
  treeNodeVersions,
} from "./schema";

import { branchVisibilityCondition } from "./service-queries";

// Knowledge node mutation operations.

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
// Node mutations
// ---------------------------------------------------------------------------

export async function syncTags(tx: Tx, actor: Principal, nodeId: string, names: string[]) {
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
export async function syncLinks(
  tx: Tx,
  nodeId: string,
  links: Array<{ toNodeId: string; linkType: string }>,
) {
  await tx
    .delete(nodeLinks)
    .where(and(eq(nodeLinks.fromNodeId, nodeId), ne(nodeLinks.linkType, "related")));
  for (const link of links) {
    if (!["related", "supports", "contrasts", "part_of"].includes(link.linkType)) {
      throw new ApiError(400, "invalid_link_type", "Invalid link type.");
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
export async function syncDerivedLinks(
  tx: Tx,
  nodeId: string,
  title: string,
  contentMd: string,
) {
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

/** Manual personal-node creation: enters `no_source` (state-machines.md). */
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
  if (!isOwnPersonalBranch) {
    throw new ApiError(
      403,
      "submission_required",
      "Shared content must go through review.",
    );
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
      changeSummary: "manual_create",
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
 * Optimistic-locked node edit — the LIVE half of the two-tier model: a node
 * in your own personal branch saves immediately (with a tree_node_versions
 * snapshot). A node anywhere else got there through promotion, and promoted
 * content never changes in place: this refuses with review_required and the
 * caller goes through proposeNodeChange → reviewNodeProposal instead.
 * `verification` / `publish` are Admin/Op-only levers — the
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
  /** The caller's login-session key; a fresh edit lock held by another session refuses the save. */
  editSessionKey?: string | null,
) {
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (!node) throw notFound();
  await assertNotLockedByOther(nodeId, editSessionKey);
  const [branch] = await db.select().from(branches).where(eq(branches.id, node.branchId));
  const isOwnPersonalBranch =
    branch?.scope === "personal" &&
    (branch.ownerUserId === actor.userId || branch.createdBy === actor.userId);
  if (!isOwnPersonalBranch) {
    authorize(actor, "knowledge.node.edit", { ownerIds: [node.createdBy], kind: "write" });
    throw new ApiError(
      403,
      "review_required",
      "A promoted node only changes through an approved proposal.",
    );
  }

  if (patch.verification !== undefined || patch.publish !== undefined) {
    // Verification transitions and the Quartz publish flag ride on
    // knowledge.publish (Admin/Op only).
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
      throw new ApiError(409, "invalid_state", "Invalid verification transition.");
    }
  }
  const nextVerification = patch.verification ?? node.verification;
  const nextPublish = patch.publish ?? node.publish;
  if (nextPublish && nextVerification !== "verified") {
    throw new ApiError(409, "invalid_state", "Only a verified node can be published.");
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
        changeSummary: "content_update",
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

/**
 * The LOCKED half of the two-tier model: propose a change to a promoted node
 * (any node outside your own personal branch). The proposal freezes the full
 * patched snapshot plus the node version it was based on; an independent
 * reviewer applies it via reviewNodeProposal.
 */
export async function proposeNodeChange(
  actor: Principal,
  nodeId: string,
  patch: {
    title?: string;
    contentMd?: string;
    tags?: string[];
    links?: Array<{ toNodeId: string; linkType: string }>;
    expectedVersion?: number;
  },
) {
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (!node || node.verification === "archived") throw notFound();
  const [branch] = await db.select().from(branches).where(eq(branches.id, node.branchId));
  if (!branch) throw notFound();
  const isOwnPersonalBranch =
    branch.scope === "personal" &&
    (branch.ownerUserId === actor.userId || branch.createdBy === actor.userId);
  if (isOwnPersonalBranch) {
    throw new ApiError(400, "live_editable", "Personal nodes are edited directly; no proposal needed.");
  }
  authorize(actor, "knowledge.node.edit", { ownerIds: [node.createdBy], kind: "write" });

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
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.change.propose",
      targetType: "node_change_proposal",
      targetId: proposal.id,
      details: { nodeId, baseVersion: proposal.baseVersion },
    });
    return { proposalId: proposal.id, state: proposal.state };
  });
}

export async function reviewNodeProposal(
  actor: Principal,
  nodeId: string,
  proposalId: string,
  input: {
    decision: "approved" | "rejected" | "changes_requested";
    verification?: "unverified" | "verified";
  },
) {
  authorize(actor, "knowledge.publish", { kind: "write" });
  const [row] = await db
    .select({ proposal: nodeChangeProposals, node: treeNodes })
    .from(nodeChangeProposals)
    .innerJoin(treeNodes, eq(treeNodes.id, nodeChangeProposals.nodeId))
    .where(and(eq(nodeChangeProposals.id, proposalId), eq(nodeChangeProposals.nodeId, nodeId)));
  if (!row || row.proposal.state !== "pending") throw notFound();
  // Proposer cannot approve their own change; the node's original author may
  // review someone else's proposal — the separation is on this proposal.
  assertIndependentReviewer(actor.userId, {
    originatorId: row.proposal.createdBy,
    lastEditorId: row.proposal.createdBy,
    submittedBy: row.proposal.createdBy,
  });

  return db.transaction(async (tx) => {
    if (input.decision !== "approved") {
      // The state='pending' guard doubles as the concurrency check: two
      // concurrent decisions race on it and the loser matches zero rows.
      const [proposal] = await tx
        .update(nodeChangeProposals)
        .set({ state: input.decision })
        .where(
          and(eq(nodeChangeProposals.id, proposalId), eq(nodeChangeProposals.state, "pending")),
        )
        .returning();
      if (!proposal) throw versionConflict();
      await recordAudit(tx, actor, {
        accountability: "approver_publisher",
        action: `node.change.${input.decision}`,
        targetType: "node_change_proposal",
        targetId: proposalId,
        details: { nodeId },
      });
      return { state: proposal.state };
    }
    if (!input.verification)
      throw new ApiError(400, "missing_verification", "A verification level is required.");
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
        changeSummary: "proposal_approved",
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
    const [proposal] = await tx
      .update(nodeChangeProposals)
      .set({ state: "approved" })
      .where(and(eq(nodeChangeProposals.id, proposalId), eq(nodeChangeProposals.state, "pending")))
      .returning();
    if (!proposal) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.change.approve",
      targetType: "tree_node",
      targetId: nodeId,
      details: { proposalId, nodeVersionId: version.id },
    });
    return node;
  });
}

export async function archiveNode(actor: Principal, nodeId: string) {
  authorize(actor, "knowledge.archive", { kind: "write" });
  const [row] = await db
    .select({ node: treeNodes, vaultId: branches.vaultId })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(treeNodes.id, nodeId));
  if (!row) throw notFound();
  const node = row.node;
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
    throw new ApiError(400, "invalid_merge", "A node cannot be merged into itself.");
  }
  const [nodeRow] = await db
    .select({ node: treeNodes, vaultId: branches.vaultId })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(treeNodes.id, nodeId));
  const [canonicalRow] = await db
    .select({ node: treeNodes, vaultId: branches.vaultId })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(treeNodes.id, canonicalNodeId));
  if (!nodeRow || !canonicalRow || nodeRow.vaultId !== canonicalRow.vaultId) throw notFound();
  const node = nodeRow.node;
  const canonical = canonicalRow.node;
  if (canonical.verification === "archived") {
    throw new ApiError(409, "invalid_state", "The canonical node must not be archived.");
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
