import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { normalizeTitle } from "@/lib/wikilink";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { requireProjectResearchRead } from "../auth/core";
import { users } from "../auth/schema";
import { recordAudit } from "../audit/service";
import { projects } from "../project/schema";
import { extractionCandidates } from "../storage/schema";
import {
  branches,
  nodeDrafts,
  nodeLinks,
  nodeProposals,
  nodeTags,
  nodeTranslationProposals,
  nodeTranslations,
  nodeTranslationVersions,
  tags,
  treeNodes,
  treeNodeVersions,
} from "./schema";
import {
  assertSafeMarkdown,
  assertUniqueWikiTitle,
  nodeAssociations,
  syncDerivedLinks,
  syncLinks,
  syncTags,
  uniqueSlug,
} from "./service-mutations";
import { copyOfficialSupportToDraft, replaceOfficialSupportFromDraft } from "./support";

export type DraftLocale = "vi" | "en";
export type ResearchPurpose = "evidence" | "synthesis";
export type DraftSnapshot = {
  title: string;
  summary?: string | null;
  sortOrder: number;
  contentMd: string;
  tags: string[];
  links: Array<{ toNodeId: string; linkType: string }>;
};

const cleanSnapshot = (input: DraftSnapshot): DraftSnapshot => ({
  title: input.title.trim(),
  summary: input.summary?.trim() || null,
  sortOrder: input.sortOrder,
  contentMd: input.contentMd,
  tags: [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))].sort(),
  links: [...input.links].sort(
    (left, right) =>
      left.toNodeId.localeCompare(right.toNodeId) || left.linkType.localeCompare(right.linkType),
  ),
});

function assertDraftSnapshot(snapshot: DraftSnapshot) {
  if (!snapshot.title) throw new ApiError(400, "invalid_draft", "Draft title is required.");
  assertSafeMarkdown(snapshot.contentMd);
}

const PROJECT_NOTES_BRANCH_NAME = "Ghi chú dự án";

function assertResearchPurpose(value: ResearchPurpose | null | undefined) {
  if (value !== undefined && value !== null && value !== "evidence" && value !== "synthesis") {
    throw new ApiError(400, "invalid_research_purpose", "Research purpose is invalid.");
  }
}

async function requireConfirmedProject(runner: Tx | typeof db, projectId: string | undefined) {
  if (!projectId) throw new ApiError(400, "invalid_project_note", "Project is required.");
  const [project] = await runner
    .select({ projectId: projects.projectId })
    .from(projects)
    .where(eq(projects.projectId, projectId));
  if (!project) throw notFound();
  return project;
}

/**
 * Start a Project-owned Note as an author-private draft. Branch is an internal
 * compatibility container; the caller supplies Project context, never scope.
 */
export async function createProjectNote(
  actor: Principal,
  input: {
    projectId?: string;
    title?: string;
    contentMd?: string;
    summary?: string | null;
    tags?: string[];
    researchPurpose?: ResearchPurpose | null;
  },
) {
  return db.transaction((tx) => createProjectNoteInTransaction(tx, actor, input));
}

/** Transaction seam for workflows that must commit a Project draft with their own state. */
export async function createProjectNoteInTransaction(
  tx: Tx,
  actor: Principal,
  input: {
    projectId?: string;
    title?: string;
    contentMd?: string;
    summary?: string | null;
    tags?: string[];
    researchPurpose?: ResearchPurpose | null;
  },
) {
  const project = await requireConfirmedProject(tx, input.projectId);
  authorize(actor, "project.note.create", { spaceId: project.projectId, kind: "write" });
  const snapshot = cleanSnapshot({
    title: input.title ?? "",
    summary: input.summary,
    sortOrder: 0,
    contentMd: input.contentMd ?? "",
    tags: input.tags ?? [],
    links: [],
  });
  assertDraftSnapshot(snapshot);
  assertResearchPurpose(input.researchPurpose);

  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${project.projectId}, 1))`);
  let [branch] = await tx
    .select()
    .from(branches)
    .where(
      and(
        eq(branches.scope, "team"),
        eq(branches.spaceId, project.projectId),
        eq(branches.name, PROJECT_NOTES_BRANCH_NAME),
        sql`${branches.archivedAt} IS NULL`,
      ),
    );
  if (!branch) {
    [branch] = await tx
      .insert(branches)
      .values({
        name: PROJECT_NOTES_BRANCH_NAME,
        scope: "team",
        spaceId: project.projectId,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "branch.create",
      targetType: "branch",
      targetId: branch.id,
      details: { scope: "team", spaceId: project.projectId, compatibility: "project_notes" },
    });
  }

  const [draft] = await tx
    .insert(nodeDrafts)
    .values({
      branchId: branch.id,
      projectId: project.projectId,
      locale: "vi",
      authorId: actor.userId,
      researchPurpose: input.researchPurpose ?? null,
      ...snapshot,
    })
    .returning();
  await recordAudit(tx, actor, {
    accountability: "editor_updater",
    action: "node.draft.create",
    targetType: "node_draft",
    targetId: draft.id,
    details: { projectId: project.projectId, branchId: branch.id, locale: "vi" },
  });
  return { ...draft, workingVisibility: "author_private" as const };
}

/** Official Project Notes plus only the caller's private working drafts. */
export async function listProjectNotes(actor: Principal, projectId: string) {
  const project = await requireConfirmedProject(db, projectId);
  await requireProjectResearchRead(actor, project.projectId);
  const notes = await db
    .select({
      id: treeNodes.id,
      projectId: treeNodes.projectId,
      researchPurpose: treeNodes.researchPurpose,
      title: treeNodes.title,
      summary: treeNodes.summary,
      verification: treeNodes.verification,
      createdBy: treeNodes.createdBy,
      createdAt: treeNodes.createdAt,
      updatedAt: treeNodes.updatedAt,
      version: treeNodes.version,
    })
    .from(treeNodes)
    .where(and(eq(treeNodes.projectId, project.projectId), ne(treeNodes.verification, "archived")))
    .orderBy(asc(treeNodes.title));
  const drafts = actor.spaceIds.includes(project.projectId)
    ? await db
        .select({
          id: nodeDrafts.id,
          nodeId: nodeDrafts.nodeId,
          projectId: nodeDrafts.projectId,
          researchPurpose: nodeDrafts.researchPurpose,
          title: nodeDrafts.title,
          summary: nodeDrafts.summary,
          state: nodeDrafts.state,
          authorId: nodeDrafts.authorId,
          draftVersion: nodeDrafts.draftVersion,
          createdAt: nodeDrafts.createdAt,
          updatedAt: nodeDrafts.updatedAt,
        })
        .from(nodeDrafts)
        .where(
          and(eq(nodeDrafts.projectId, project.projectId), eq(nodeDrafts.authorId, actor.userId)),
        )
        .orderBy(desc(nodeDrafts.updatedAt))
    : [];
  return { notes, drafts };
}

/** One authoritative Project Note without exposing its compatibility Branch. */
export async function getProjectNote(actor: Principal, projectId: string, nodeId: string) {
  const project = await requireConfirmedProject(db, projectId);
  await requireProjectResearchRead(actor, project.projectId);
  const [note] = await db
    .select({
      id: treeNodes.id,
      projectId: treeNodes.projectId,
      title: treeNodes.title,
      summary: treeNodes.summary,
      contentMd: treeNodes.contentMd,
      researchPurpose: treeNodes.researchPurpose,
      verification: treeNodes.verification,
      currentVersion: treeNodes.version,
      createdAt: treeNodes.createdAt,
      updatedAt: treeNodes.updatedAt,
    })
    .from(treeNodes)
    .where(
      and(
        eq(treeNodes.id, nodeId),
        eq(treeNodes.projectId, project.projectId),
        ne(treeNodes.verification, "archived"),
      ),
    );
  if (!note) throw notFound();
  const tagRows = await db
    .select({ name: tags.name })
    .from(nodeTags)
    .innerJoin(tags, eq(tags.id, nodeTags.tagId))
    .where(eq(nodeTags.nodeId, note.id))
    .orderBy(asc(tags.name));
  return { ...note, tags: tagRows.map((row) => row.name) };
}

const translationSlug = (title: string) =>
  normalizeTitle(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "page";

async function teamBranch(actor: Principal, branchId: string) {
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
  if (!branch || branch.scope !== "team" || branch.archivedAt || !branch.spaceId) throw notFound();
  authorize(actor, "knowledge.draft.write", { spaceId: branch.spaceId, kind: "write" });
  return branch;
}

async function ownedDraft(actor: Principal, draftId: string) {
  const [row] = await db
    .select({ draft: nodeDrafts, branch: branches, node: treeNodes })
    .from(nodeDrafts)
    .innerJoin(branches, eq(branches.id, nodeDrafts.branchId))
    .leftJoin(treeNodes, eq(treeNodes.id, nodeDrafts.nodeId))
    .where(and(eq(nodeDrafts.id, draftId), eq(nodeDrafts.authorId, actor.userId)));
  if (!row || row.branch.scope !== "team" || !row.branch.spaceId || row.branch.archivedAt)
    throw notFound();
  authorize(actor, "knowledge.draft.write", { spaceId: row.branch.spaceId, kind: "write" });
  return row;
}

export async function getDraft(actor: Principal, draftId: string) {
  return (await ownedDraft(actor, draftId)).draft;
}

async function nodeSnapshot(nodeId: string): Promise<DraftSnapshot> {
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, nodeId));
  if (!node) throw notFound();
  const [tagRows, linkRows] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(nodeTags)
      .innerJoin(tags, eq(tags.id, nodeTags.tagId))
      .where(eq(nodeTags.nodeId, nodeId)),
    db
      .select({ toNodeId: nodeLinks.toNodeId, linkType: nodeLinks.linkType })
      .from(nodeLinks)
      .where(eq(nodeLinks.fromNodeId, nodeId)),
  ]);
  return cleanSnapshot({
    title: node.title,
    summary: node.summary,
    sortOrder: node.sortOrder,
    contentMd: node.contentMd,
    tags: tagRows.map((tag) => tag.name),
    links: linkRows,
  });
}

async function officialSnapshot(nodeId: string, locale: DraftLocale) {
  const [row] = await db
    .select({ node: treeNodes, branch: branches, translation: nodeTranslations })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .leftJoin(
      nodeTranslations,
      and(eq(nodeTranslations.nodeId, treeNodes.id), eq(nodeTranslations.locale, "en")),
    )
    .where(eq(treeNodes.id, nodeId));
  if (!row || row.branch.scope !== "team" || !row.branch.spaceId || row.branch.archivedAt)
    throw notFound();
  const base = await nodeSnapshot(nodeId);
  if (locale === "vi") return { ...row, version: row.node.version, snapshot: base };
  return {
    ...row,
    version: row.translation?.version ?? 0,
    snapshot: cleanSnapshot({
      ...base,
      title: row.translation?.title ?? row.node.title,
      summary: row.translation?.summary ?? null,
      contentMd: row.translation?.contentMd ?? "",
    }),
  };
}

export async function getMyNodeDraft(actor: Principal, nodeId: string, locale: DraftLocale = "vi") {
  const official = await officialSnapshot(nodeId, locale);
  authorize(actor, "knowledge.draft.write", { spaceId: official.branch.spaceId!, kind: "write" });
  const [draft] = await db
    .select()
    .from(nodeDrafts)
    .where(
      and(
        eq(nodeDrafts.nodeId, nodeId),
        eq(nodeDrafts.locale, locale),
        eq(nodeDrafts.authorId, actor.userId),
      ),
    );
  const baseVersion = draft?.baseVersion ?? official.version;
  let baseContent = official.snapshot.contentMd;
  if (baseVersion !== official.version) {
    if (locale === "vi") {
      const [version] = await db
        .select({ contentMd: treeNodeVersions.contentMd })
        .from(treeNodeVersions)
        .where(and(eq(treeNodeVersions.nodeId, nodeId), eq(treeNodeVersions.seq, baseVersion)));
      if (version) baseContent = version.contentMd;
    } else {
      const [version] = await db
        .select({ contentMd: nodeTranslationVersions.contentMd })
        .from(nodeTranslationVersions)
        .where(
          and(
            eq(nodeTranslationVersions.nodeId, nodeId),
            eq(nodeTranslationVersions.locale, "en"),
            eq(nodeTranslationVersions.seq, baseVersion),
          ),
        );
      if (version) baseContent = version.contentMd;
    }
  }
  return {
    draft: draft ?? null,
    officialVersion: official.version,
    official: official.snapshot,
    baseContent,
  };
}

export async function createTeamDraft(
  actor: Principal,
  input: DraftSnapshot & { branchId: string; locale?: DraftLocale },
) {
  const branch = await teamBranch(actor, input.branchId);
  if ((input.locale ?? "vi") !== "vi") {
    throw new ApiError(400, "invalid_draft", "A new team page must start in Vietnamese.");
  }
  const snapshot = cleanSnapshot(input);
  assertDraftSnapshot(snapshot);
  return db.transaction(async (tx) => {
    const [draft] = await tx
      .insert(nodeDrafts)
      .values({
        branchId: branch.id,
        locale: "vi",
        authorId: actor.userId,
        ...snapshot,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.draft.create",
      targetType: "node_draft",
      targetId: draft.id,
      details: { branchId: branch.id, locale: "vi" },
    });
    return draft;
  });
}

export async function saveNodeDraft(
  actor: Principal,
  nodeId: string,
  locale: DraftLocale,
  input: DraftSnapshot & { baseVersion: number; expectedDraftVersion: number },
) {
  const official = await officialSnapshot(nodeId, locale);
  authorize(actor, "knowledge.draft.write", { spaceId: official.branch.spaceId!, kind: "write" });
  if (official.node.verification === "archived") throw notFound();
  const snapshot = cleanSnapshot(input);
  assertDraftSnapshot(snapshot);
  if (input.expectedDraftVersion === 0) {
    if (official.version !== input.baseVersion) throw officialConflict(input.baseVersion, official);
    const created = await db.transaction(async (tx) => {
      const [draft] = await tx
        .insert(nodeDrafts)
        .values({
          nodeId,
          branchId: official.branch.id,
          projectId: official.node.projectId,
          researchPurpose: official.node.researchPurpose,
          locale,
          authorId: actor.userId,
          baseVersion: input.baseVersion,
          ...snapshot,
        })
        .onConflictDoNothing()
        .returning();
      if (draft && locale === "vi" && draft.projectId) {
        await copyOfficialSupportToDraft(tx, nodeId, draft.id);
      }
      return draft;
    });
    if (created) return created;
  }
  const [updated] = await db
    .update(nodeDrafts)
    .set({ ...snapshot, draftVersion: input.expectedDraftVersion + 1, updatedAt: new Date() })
    .where(
      and(
        eq(nodeDrafts.nodeId, nodeId),
        eq(nodeDrafts.locale, locale),
        eq(nodeDrafts.authorId, actor.userId),
        eq(nodeDrafts.state, "editing"),
        eq(nodeDrafts.draftVersion, input.expectedDraftVersion),
      ),
    )
    .returning();
  if (!updated) {
    const [current] = await db
      .select()
      .from(nodeDrafts)
      .where(
        and(
          eq(nodeDrafts.nodeId, nodeId),
          eq(nodeDrafts.locale, locale),
          eq(nodeDrafts.authorId, actor.userId),
        ),
      );
    throw new ApiError(409, "draft_version_conflict", "The draft changed in another session.", {
      current,
      yours: snapshot,
    });
  }
  return updated;
}

export async function updateDraft(
  actor: Principal,
  draftId: string,
  input: DraftSnapshot & { expectedDraftVersion: number },
) {
  const row = await ownedDraft(actor, draftId);
  if (row.draft.state !== "editing")
    throw new ApiError(409, "draft_in_review", "The draft is currently in review.");
  const snapshot = cleanSnapshot(input);
  assertDraftSnapshot(snapshot);
  const [updated] = await db
    .update(nodeDrafts)
    .set({ ...snapshot, draftVersion: input.expectedDraftVersion + 1, updatedAt: new Date() })
    .where(and(eq(nodeDrafts.id, draftId), eq(nodeDrafts.draftVersion, input.expectedDraftVersion)))
    .returning();
  if (!updated) throw versionConflict();
  return updated;
}

export async function updateProjectDraftPurpose(
  actor: Principal,
  input: {
    draftId: string;
    researchPurpose: ResearchPurpose | null;
    expectedDraftVersion: number;
  },
) {
  assertResearchPurpose(input.researchPurpose);
  const row = await ownedDraft(actor, input.draftId);
  if (!row.draft.projectId || row.draft.locale !== "vi") throw notFound();
  if (row.draft.state !== "editing") {
    throw new ApiError(409, "draft_in_review", "The draft is currently in review.");
  }
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(nodeDrafts)
      .set({
        researchPurpose: input.researchPurpose,
        draftVersion: input.expectedDraftVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(nodeDrafts.id, input.draftId),
          eq(nodeDrafts.draftVersion, input.expectedDraftVersion),
        ),
      )
      .returning();
    if (!updated) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.draft.research_purpose.change",
      targetType: "node_draft",
      targetId: input.draftId,
      details: {
        projectId: row.draft.projectId,
        from: row.draft.researchPurpose,
        to: input.researchPurpose,
      },
    });
    return updated;
  });
}

function officialConflict(
  baseVersion: number,
  official: Awaited<ReturnType<typeof officialSnapshot>>,
) {
  return new ApiError(409, "official_version_conflict", "The official page changed.", {
    baseVersion,
    currentVersion: official.version,
    current: official.snapshot,
  });
}

async function appendNodeVersion(
  tx: Tx,
  actor: Principal,
  node: typeof treeNodes.$inferSelect,
  snapshot: DraftSnapshot,
  changeSummary: string,
  reviewStatus: "pending" | "approved" = "pending",
) {
  const [{ maxSeq }] = await tx
    .select({ maxSeq: sql<number>`coalesce(max(${treeNodeVersions.seq}), 0)::int` })
    .from(treeNodeVersions)
    .where(eq(treeNodeVersions.nodeId, node.id));
  const associations = await nodeAssociations(tx, node.id);
  return tx.insert(treeNodeVersions).values({
    nodeId: node.id,
    seq: maxSeq + 1,
    contentMd: snapshot.contentMd,
    verification: node.verification,
    createdBy: actor.userId,
    changeSummary,
    reviewStatus,
    title: snapshot.title,
    summary: snapshot.summary,
    sortOrder: snapshot.sortOrder,
    tags: associations.tags,
    links: associations.links,
    publish: node.publish,
    reviewRequired: node.reviewRequired,
    snapshotComplete: true,
  });
}

export async function publishDraft(actor: Principal, draftId: string) {
  const row = await ownedDraft(actor, draftId);
  authorize(actor, "knowledge.draft.publish", { spaceId: row.branch.spaceId!, kind: "write" });
  if (row.draft.state !== "editing")
    throw new ApiError(409, "draft_in_review", "The draft is currently in review.");
  if (row.node?.reviewRequired)
    throw new ApiError(409, "protected_review_required", "This page requires review.");
  const snapshot = cleanSnapshot(row.draft);
  assertDraftSnapshot(snapshot);

  return db.transaction(async (tx) => {
    await assertUniqueWikiTitle(tx, row.branch.spaceId!, snapshot.title, row.draft.nodeId);
    if (!row.node) {
      const slug = await uniqueSlug(tx, row.branch.id, snapshot.title);
      const [node] = await tx
        .insert(treeNodes)
        .values({
          branchId: row.branch.id,
          projectId: row.draft.projectId,
          researchPurpose: row.draft.researchPurpose,
          title: snapshot.title,
          summary: snapshot.summary,
          sortOrder: snapshot.sortOrder,
          slug,
          contentMd: snapshot.contentMd,
          verification: "unverified",
          publish: false,
          createdBy: actor.userId,
        })
        .returning();
      await syncTags(tx, actor, node.id, snapshot.tags);
      await syncLinks(tx, actor, node.id, snapshot.links);
      await syncDerivedLinks(tx, actor, node.id, snapshot.title, snapshot.contentMd);
      await appendNodeVersion(tx, actor, node, snapshot, "draft_published");
      await replaceOfficialSupportFromDraft(tx, node.id, draftId);
      await tx
        .update(extractionCandidates)
        .set({ evolvedDraftId: null, evolvedNodeId: node.id })
        .where(eq(extractionCandidates.evolvedDraftId, draftId));
      await tx.delete(nodeDrafts).where(eq(nodeDrafts.id, draftId));
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "node.draft.publish",
        targetType: "tree_node",
        targetId: node.id,
        details: { draftId, projectId: node.projectId, created: true },
      });
      return { nodeId: node.id, version: node.version, locale: "vi" as const };
    }

    if (row.draft.locale === "vi") {
      if (row.node.version !== row.draft.baseVersion) {
        throw officialConflict(row.draft.baseVersion, await officialSnapshot(row.node.id, "vi"));
      }
      const slug =
        snapshot.title === row.node.title
          ? row.node.slug
          : await uniqueSlug(tx, row.branch.id, snapshot.title, row.node.id);
      const [node] = await tx
        .update(treeNodes)
        .set({
          title: snapshot.title,
          summary: snapshot.summary,
          sortOrder: snapshot.sortOrder,
          slug,
          contentMd: snapshot.contentMd,
          researchPurpose: row.draft.researchPurpose,
          verification: "unverified",
          publish: false,
          updatedAt: new Date(),
          version: row.node.version + 1,
        })
        .where(and(eq(treeNodes.id, row.node.id), eq(treeNodes.version, row.draft.baseVersion)))
        .returning();
      if (!node) throw versionConflict();
      await syncTags(tx, actor, node.id, snapshot.tags);
      await syncLinks(tx, actor, node.id, snapshot.links);
      await syncDerivedLinks(tx, actor, node.id, snapshot.title, snapshot.contentMd);
      await appendNodeVersion(tx, actor, node, snapshot, "draft_published");
      await replaceOfficialSupportFromDraft(tx, node.id, draftId);
      await tx.delete(nodeDrafts).where(eq(nodeDrafts.id, draftId));
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "node.draft.publish",
        targetType: "tree_node",
        targetId: node.id,
        details: { draftId, from: row.node.version, to: node.version },
      });
      return { nodeId: node.id, version: node.version, locale: "vi" as const };
    }

    const [currentTranslation] = await tx
      .select({ version: nodeTranslations.version })
      .from(nodeTranslations)
      .where(and(eq(nodeTranslations.nodeId, row.node.id), eq(nodeTranslations.locale, "en")));
    const currentVersion = currentTranslation?.version ?? 0;
    if (currentVersion !== row.draft.baseVersion) {
      throw officialConflict(row.draft.baseVersion, await officialSnapshot(row.node.id, "en"));
    }
    const version = currentVersion + 1;
    const [translation] = await tx
      .insert(nodeTranslations)
      .values({
        nodeId: row.node.id,
        locale: "en",
        title: snapshot.title,
        summary: snapshot.summary,
        contentMd: snapshot.contentMd,
        slug: translationSlug(snapshot.title),
        version,
        updatedBy: actor.userId,
      })
      .onConflictDoUpdate({
        target: [nodeTranslations.nodeId, nodeTranslations.locale],
        set: {
          title: snapshot.title,
          summary: snapshot.summary,
          contentMd: snapshot.contentMd,
          slug: translationSlug(snapshot.title),
          version,
          updatedBy: actor.userId,
          updatedAt: new Date(),
        },
      })
      .returning();
    await tx.insert(nodeTranslationVersions).values({
      nodeId: row.node.id,
      locale: "en",
      seq: version,
      title: translation.title,
      summary: translation.summary,
      contentMd: translation.contentMd,
      createdBy: actor.userId,
      snapshotComplete: true,
    });
    await tx.delete(nodeDrafts).where(eq(nodeDrafts.id, draftId));
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.translation.draft.publish",
      targetType: "tree_node",
      targetId: row.node.id,
      details: { draftId, locale: "en", version },
    });
    return { nodeId: row.node.id, version, locale: "en" as const };
  });
}

export async function submitDraftForReview(actor: Principal, draftId: string) {
  const row = await ownedDraft(actor, draftId);
  if (!row.node || !row.node.reviewRequired) {
    throw new ApiError(409, "review_not_required", "This page can be self-published.");
  }
  const node = row.node;
  if (row.draft.state !== "editing")
    throw new ApiError(409, "draft_in_review", "The draft is currently in review.");
  const official = await officialSnapshot(node.id, row.draft.locale);
  if (official.version !== row.draft.baseVersion)
    throw officialConflict(row.draft.baseVersion, official);

  return db.transaction(async (tx) => {
    let proposalId: string;
    if (row.draft.locale === "vi") {
      const [proposal] = await tx
        .insert(nodeProposals)
        .values({
          kind: "change",
          nodeId: node.id,
          baseVersion: row.draft.baseVersion,
          title: row.draft.title,
          summary: row.draft.summary,
          sortOrder: row.draft.sortOrder,
          contentMd: row.draft.contentMd,
          tags: row.draft.tags,
          links: row.draft.links,
          createdBy: actor.userId,
        })
        .returning({ id: nodeProposals.id });
      proposalId = proposal.id;
    } else {
      const [proposal] = await tx
        .insert(nodeTranslationProposals)
        .values({
          nodeId: node.id,
          locale: "en",
          baseVersion: row.draft.baseVersion,
          title: row.draft.title,
          summary: row.draft.summary,
          contentMd: row.draft.contentMd,
          createdBy: actor.userId,
        })
        .returning({ id: nodeTranslationProposals.id });
      proposalId = proposal.id;
    }
    await tx
      .update(nodeDrafts)
      .set({ state: "in_review", submittedProposalId: proposalId, updatedAt: new Date() })
      .where(and(eq(nodeDrafts.id, draftId), eq(nodeDrafts.state, "editing")));
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.draft.submit_review",
      targetType: "node_draft",
      targetId: draftId,
      details: { nodeId: node.id, locale: row.draft.locale, proposalId },
    });
    return { draftId, proposalId, state: "in_review" as const };
  });
}

export async function rebaseDraft(
  actor: Principal,
  draftId: string,
  input: DraftSnapshot & { expectedOfficialVersion: number; expectedDraftVersion: number },
) {
  const row = await ownedDraft(actor, draftId);
  if (!row.node || row.draft.state !== "editing")
    throw new ApiError(409, "invalid_state", "Draft cannot be rebased.");
  const official = await officialSnapshot(row.node.id, row.draft.locale);
  if (official.version !== input.expectedOfficialVersion)
    throw officialConflict(input.expectedOfficialVersion, official);
  const snapshot = cleanSnapshot(input);
  assertDraftSnapshot(snapshot);
  const [updated] = await db
    .update(nodeDrafts)
    .set({
      ...snapshot,
      baseVersion: official.version,
      draftVersion: input.expectedDraftVersion + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(nodeDrafts.id, draftId), eq(nodeDrafts.draftVersion, input.expectedDraftVersion)))
    .returning();
  if (!updated) throw versionConflict();
  return updated;
}

export async function discardDraft(actor: Principal, draftId: string) {
  const row = await ownedDraft(actor, draftId);
  if (row.draft.state === "in_review")
    throw new ApiError(409, "draft_in_review", "The draft is currently in review.");
  await db.transaction(async (tx) => {
    await tx.delete(nodeDrafts).where(eq(nodeDrafts.id, draftId));
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.draft.discard",
      targetType: "node_draft",
      targetId: draftId,
      details: { nodeId: row.draft.nodeId, locale: row.draft.locale },
    });
  });
}

export async function restoreNodeVersionToDraft(actor: Principal, nodeId: string, seq: number) {
  const official = await officialSnapshot(nodeId, "vi");
  authorize(actor, "knowledge.draft.write", { spaceId: official.branch.spaceId!, kind: "write" });
  if (official.node.verification === "archived") throw notFound();
  const [version] = await db
    .select()
    .from(treeNodeVersions)
    .where(and(eq(treeNodeVersions.nodeId, nodeId), eq(treeNodeVersions.seq, seq)));
  if (!version) throw notFound();

  const legacyPartial = !version.snapshotComplete;
  const snapshot = cleanSnapshot({
    title: version.snapshotComplete && version.title ? version.title : official.snapshot.title,
    summary: version.snapshotComplete ? version.summary : official.snapshot.summary,
    sortOrder:
      version.snapshotComplete && version.sortOrder !== null
        ? version.sortOrder
        : official.snapshot.sortOrder,
    contentMd: version.contentMd,
    tags:
      version.snapshotComplete && Array.isArray(version.tags)
        ? (version.tags as string[])
        : official.snapshot.tags,
    links:
      version.snapshotComplete && Array.isArray(version.links)
        ? (version.links as Array<{ toNodeId: string; linkType: string }>)
        : official.snapshot.links,
  });

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(nodeDrafts)
      .where(
        and(
          eq(nodeDrafts.nodeId, nodeId),
          eq(nodeDrafts.locale, "vi"),
          eq(nodeDrafts.authorId, actor.userId),
        ),
      );
    if (existing?.state === "in_review") {
      throw new ApiError(409, "draft_in_review", "The draft is currently in review.");
    }
    const [draft] = existing
      ? await tx
          .update(nodeDrafts)
          .set({
            ...snapshot,
            baseVersion: official.version,
            draftVersion: existing.draftVersion + 1,
            updatedAt: new Date(),
          })
          .where(
            and(eq(nodeDrafts.id, existing.id), eq(nodeDrafts.draftVersion, existing.draftVersion)),
          )
          .returning()
      : await tx
          .insert(nodeDrafts)
          .values({
            nodeId,
            branchId: official.branch.id,
            projectId: official.node.projectId,
            researchPurpose: official.node.researchPurpose,
            locale: "vi",
            authorId: actor.userId,
            baseVersion: official.version,
            ...snapshot,
          })
          .onConflictDoNothing()
          .returning();
    if (!draft) throw versionConflict();
    if (!existing && draft.projectId) {
      await copyOfficialSupportToDraft(tx, nodeId, draft.id);
    }
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "node.version.restore_to_draft",
      targetType: "node_draft",
      targetId: draft.id,
      details: { nodeId, seq, legacyPartial },
    });
    return { draft, legacyPartial };
  });
}

export async function setNodeProtection(actor: Principal, nodeId: string, reviewRequired: boolean) {
  const [row] = await db
    .select({ node: treeNodes, branch: branches })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(treeNodes.id, nodeId));
  if (!row || row.branch.scope !== "team" || !row.branch.spaceId) throw notFound();
  authorize(actor, "knowledge.protect", { spaceId: row.branch.spaceId, kind: "write" });
  if (row.node.reviewRequired === reviewRequired) return row.node;
  return db.transaction(async (tx) => {
    const [node] = await tx
      .update(treeNodes)
      .set({ reviewRequired, updatedAt: new Date(), version: row.node.version + 1 })
      .where(and(eq(treeNodes.id, nodeId), eq(treeNodes.version, row.node.version)))
      .returning();
    if (!node) throw versionConflict();
    await appendNodeVersion(tx, actor, node, await nodeSnapshot(nodeId), "protection_changed");
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "node.protection.change",
      targetType: "tree_node",
      targetId: nodeId,
      details: { from: row.node.reviewRequired, to: reviewRequired },
    });
    return node;
  });
}

export async function getPendingDraftReviewsForNode(actor: Principal, nodeId: string) {
  const official = await officialSnapshot(nodeId, "vi");
  authorize(actor, "knowledge.publish", { spaceId: official.branch.spaceId!, kind: "read" });
  const [changes, translations] = await Promise.all([
    db
      .select({
        proposalId: nodeProposals.id,
        authorId: nodeProposals.createdBy,
        authorName: users.displayName,
        contentMd: nodeProposals.contentMd,
        title: nodeProposals.title,
      })
      .from(nodeProposals)
      .innerJoin(users, eq(users.id, nodeProposals.createdBy))
      .where(
        and(
          eq(nodeProposals.nodeId, nodeId),
          eq(nodeProposals.kind, "change"),
          eq(nodeProposals.state, "pending"),
        ),
      ),
    db
      .select({
        proposalId: nodeTranslationProposals.id,
        authorId: nodeTranslationProposals.createdBy,
        authorName: users.displayName,
        contentMd: nodeTranslationProposals.contentMd,
        title: nodeTranslationProposals.title,
      })
      .from(nodeTranslationProposals)
      .innerJoin(users, eq(users.id, nodeTranslationProposals.createdBy))
      .where(
        and(
          eq(nodeTranslationProposals.nodeId, nodeId),
          eq(nodeTranslationProposals.state, "pending"),
        ),
      ),
  ]);
  const english = await officialSnapshot(nodeId, "en");
  return [
    ...changes.map((proposal) => ({
      ...proposal,
      kind: "vi" as const,
      currentContentMd: official.snapshot.contentMd,
    })),
    ...translations.map((proposal) => ({
      ...proposal,
      kind: "en" as const,
      currentContentMd: english.snapshot.contentMd,
    })),
  ];
}
