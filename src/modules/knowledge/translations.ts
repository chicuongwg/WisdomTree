import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { assertIndependentReviewer } from "../auth/maker-checker";
import { recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import {
  branches,
  nodeTranslationProposals,
  nodeTranslations,
  nodeTranslationVersions,
  treeNodes,
} from "./schema";
import { assertSafeMarkdown } from "./service-mutations";
import { branchVisibilityCondition } from "./service-queries";

export type TranslationLocale = "en";

function translationSlug(title: string): string {
  return (
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "page"
  );
}

export async function getNodeTranslation(actor: Principal, nodeId: string, locale: TranslationLocale) {
  const [row] = await db
    .select({ translation: nodeTranslations })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .leftJoin(
      nodeTranslations,
      and(eq(nodeTranslations.nodeId, treeNodes.id), eq(nodeTranslations.locale, locale)),
    )
    .where(and(eq(treeNodes.id, nodeId), branchVisibilityCondition(actor)));
  if (!row) throw notFound();
  return row.translation;
}

export async function saveNodeTranslation(
  actor: Principal,
  nodeId: string,
  locale: TranslationLocale,
  input: { title: string; summary?: string; contentMd: string; expectedVersion?: number },
) {
  assertSafeMarkdown(input.contentMd);
  const [row] = await db
    .select({ node: treeNodes, branch: branches, translation: nodeTranslations })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .leftJoin(
      nodeTranslations,
      and(eq(nodeTranslations.nodeId, treeNodes.id), eq(nodeTranslations.locale, locale)),
    )
    .where(and(eq(treeNodes.id, nodeId), branchVisibilityCondition(actor)));
  if (!row || row.node.verification === "archived") throw notFound();
  const baseVersion = row.translation?.version ?? 0;
  if (input.expectedVersion !== undefined && input.expectedVersion !== baseVersion) throw versionConflict();

  if (row.branch.scope === "team") {
    authorize(actor, "knowledge.node.edit", { spaceId: row.branch.spaceId!, kind: "write" });
    const [pending] = await db
      .select({ id: nodeTranslationProposals.id })
      .from(nodeTranslationProposals)
      .where(
        and(
          eq(nodeTranslationProposals.nodeId, nodeId),
          eq(nodeTranslationProposals.locale, locale),
          eq(nodeTranslationProposals.state, "pending"),
        ),
      );
    if (pending) throw new ApiError(409, "translation_pending", "This translation already has a pending proposal.");
    const [proposal] = await db
      .insert(nodeTranslationProposals)
      .values({
        nodeId,
        locale,
        baseVersion,
        title: input.title.trim(),
        summary: input.summary?.trim() || null,
        contentMd: input.contentMd,
        createdBy: actor.userId,
      })
      .returning();
    return { state: "pending" as const, proposalId: proposal.id };
  }

  authorize(actor, "knowledge.branch.edit", {
    ownerIds: [row.branch.ownerUserId, row.branch.createdBy],
    kind: "write",
  });
  return db.transaction(async (tx) => {
    const version = baseVersion + 1;
    const [translation] = await tx
      .insert(nodeTranslations)
      .values({
        nodeId,
        locale,
        title: input.title.trim(),
        summary: input.summary?.trim() || null,
        contentMd: input.contentMd,
        slug: translationSlug(input.title),
        version,
        updatedBy: actor.userId,
      })
      .onConflictDoUpdate({
        target: [nodeTranslations.nodeId, nodeTranslations.locale],
        set: {
          title: input.title.trim(),
          summary: input.summary?.trim() || null,
          contentMd: input.contentMd,
          slug: translationSlug(input.title),
          version,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        },
      })
      .returning();
    await tx.insert(nodeTranslationVersions).values({
      nodeId,
      locale,
      seq: version,
      title: translation.title,
      summary: translation.summary,
      contentMd: translation.contentMd,
      createdBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.translation.update",
      targetType: "tree_node",
      targetId: nodeId,
      details: { locale, version },
    });
    return { state: "saved" as const, translation };
  });
}

export async function listPendingTranslations(actor: Principal) {
  authorize(actor, "knowledge.review.list", { kind: "read" });
  const reviewSpaces = actor.spaceMemberships
    .filter((membership) => membership.role !== "viewer")
    .map((membership) => membership.spaceId);
  return db
    .select({
      id: nodeTranslationProposals.id,
      nodeId: nodeTranslationProposals.nodeId,
      locale: nodeTranslationProposals.locale,
      title: nodeTranslationProposals.title,
      authorName: users.displayName,
      createdAt: nodeTranslationProposals.createdAt,
    })
    .from(nodeTranslationProposals)
    .innerJoin(treeNodes, eq(treeNodes.id, nodeTranslationProposals.nodeId))
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .innerJoin(users, eq(users.id, nodeTranslationProposals.createdBy))
    .where(
      and(
        eq(nodeTranslationProposals.state, "pending"),
        branchVisibilityCondition(actor),
        actor.role === "admin_op"
          ? undefined
          : reviewSpaces.length
            ? inArray(branches.spaceId, reviewSpaces)
            : sql`false`,
      ),
    )
    .orderBy(asc(nodeTranslationProposals.createdAt));
}

export async function getTranslationProposal(actor: Principal, proposalId: string) {
  authorize(actor, "knowledge.review.list", { kind: "read" });
  const [row] = await db
    .select({ proposal: nodeTranslationProposals, nodeTitle: treeNodes.title, spaceId: branches.spaceId })
    .from(nodeTranslationProposals)
    .innerJoin(treeNodes, eq(treeNodes.id, nodeTranslationProposals.nodeId))
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(nodeTranslationProposals.id, proposalId));
  if (!row) throw notFound();
  authorize(actor, "knowledge.publish", { spaceId: row.spaceId!, kind: "read" });
  return row;
}

export async function reviewTranslationProposal(
  actor: Principal,
  proposalId: string,
  input: { decision: "approved" | "rejected" | "changes_requested"; note?: string },
) {
  const row = await getTranslationProposal(actor, proposalId);
  authorize(actor, "knowledge.publish", { spaceId: row.spaceId!, kind: "write" });
  assertIndependentReviewer(actor.userId, { submittedBy: row.proposal.createdBy });
  if (row.proposal.state !== "pending") throw notFound();
  if (input.decision !== "approved") {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(nodeTranslationProposals)
        .set({ state: input.decision, decisionNote: input.note?.trim() || null, decidedBy: actor.userId, updatedAt: new Date() })
        .where(and(eq(nodeTranslationProposals.id, proposalId), eq(nodeTranslationProposals.state, "pending")))
        .returning();
      if (!updated) throw versionConflict();
      await recordAudit(tx, actor, {
        accountability: "approver_publisher",
        action: `node.translation.${input.decision}`,
        targetType: "tree_node",
        targetId: row.proposal.nodeId,
        details: { locale: row.proposal.locale, proposalId },
      });
      return { state: updated.state };
    });
  }
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(nodeTranslations)
      .where(and(eq(nodeTranslations.nodeId, row.proposal.nodeId), eq(nodeTranslations.locale, row.proposal.locale)));
    if ((current?.version ?? 0) !== row.proposal.baseVersion) throw versionConflict();
    const version = row.proposal.baseVersion + 1;
    const [translation] = await tx
      .insert(nodeTranslations)
      .values({
        nodeId: row.proposal.nodeId,
        locale: row.proposal.locale,
        title: row.proposal.title,
        summary: row.proposal.summary,
        contentMd: row.proposal.contentMd,
        slug: translationSlug(row.proposal.title),
        version,
        updatedBy: row.proposal.createdBy,
      })
      .onConflictDoUpdate({
        target: [nodeTranslations.nodeId, nodeTranslations.locale],
        set: {
          title: row.proposal.title,
          summary: row.proposal.summary,
          contentMd: row.proposal.contentMd,
          slug: translationSlug(row.proposal.title),
          version,
          updatedBy: row.proposal.createdBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    await tx.insert(nodeTranslationVersions).values({
      nodeId: translation.nodeId,
      locale: translation.locale,
      seq: version,
      title: translation.title,
      summary: translation.summary,
      contentMd: translation.contentMd,
      createdBy: row.proposal.createdBy,
      reviewStatus: "approved",
    });
    const [proposal] = await tx
      .update(nodeTranslationProposals)
      .set({ state: "approved", decidedBy: actor.userId, updatedAt: new Date() })
      .where(and(eq(nodeTranslationProposals.id, proposalId), eq(nodeTranslationProposals.state, "pending")))
      .returning();
    if (!proposal) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "approver_publisher",
      action: "node.translation.approve",
      targetType: "tree_node",
      targetId: translation.nodeId,
      details: { locale: translation.locale, version, proposalId },
    });
    return { state: "approved" as const, translation };
  });
}
