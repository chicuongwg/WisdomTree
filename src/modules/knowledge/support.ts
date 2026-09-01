import { and, eq, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { requireProjectResearchRead, researchReadableProjectIds } from "../auth/core";
import { recordAudit } from "../audit/service";
import { projects } from "../project/schema";
import { sources, sourceVersions } from "../storage/schema";
import {
  draftSupportNoteVersions,
  draftSupportSourceVersions,
  nodeDrafts,
  noteSupportNoteVersions,
  noteSupportSourceVersions,
  treeNodes,
  treeNodeVersions,
} from "./schema";

type Runner = Tx | typeof db;

async function requireOwnedProjectDraft(runner: Runner, actor: Principal, draftId: string) {
  const [draft] = await runner
    .select()
    .from(nodeDrafts)
    .innerJoin(projects, eq(projects.projectId, nodeDrafts.projectId))
    .where(and(eq(nodeDrafts.id, draftId), eq(nodeDrafts.authorId, actor.userId)));
  if (!draft || draft.node_drafts.locale !== "vi") throw notFound();
  authorize(actor, "project.note.create", {
    spaceId: draft.projects.projectId,
    kind: "write",
  });
  if (draft.node_drafts.state !== "editing") {
    throw new ApiError(409, "draft_in_review", "The draft is currently in review.");
  }
  return draft.node_drafts;
}

async function requireSupportingSourceVersion(
  runner: Runner,
  actor: Principal,
  sourceVersionId: string,
) {
  const [row] = await runner
    .select({
      sourceVersionId: sourceVersions.id,
      sourceId: sources.id,
      sourceTitle: sources.title,
      seq: sourceVersions.seq,
      projectId: projects.projectId,
    })
    .from(sourceVersions)
    .innerJoin(sources, eq(sources.id, sourceVersions.sourceId))
    .innerJoin(projects, eq(projects.projectId, sources.spaceId))
    .where(eq(sourceVersions.id, sourceVersionId));
  if (!row) throw notFound();
  await requireProjectResearchRead(actor, row.projectId, runner);
  return row;
}

async function requireSupportingNoteVersion(
  runner: Runner,
  actor: Principal,
  noteVersionId: string,
) {
  const [row] = await runner
    .select({
      noteVersionId: treeNodeVersions.id,
      nodeId: treeNodes.id,
      nodeTitle: treeNodes.title,
      seq: treeNodeVersions.seq,
      projectId: projects.projectId,
    })
    .from(treeNodeVersions)
    .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .where(eq(treeNodeVersions.id, noteVersionId));
  if (!row) throw notFound();
  await requireProjectResearchRead(actor, row.projectId, runner);
  return row;
}

export async function addDraftSupportingSourceVersion(
  actor: Principal,
  input: { draftId: string; sourceVersionId: string },
) {
  return db.transaction(async (tx) => {
    const draft = await requireOwnedProjectDraft(tx, actor, input.draftId);
    const support = await requireSupportingSourceVersion(tx, actor, input.sourceVersionId);
    const [created] = await tx
      .insert(draftSupportSourceVersions)
      .values({ ...input, createdBy: actor.userId })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "node.support.source.add",
        targetType: "node_draft",
        targetId: draft.id,
        details: {
          sourceVersionId: support.sourceVersionId,
          targetProjectId: draft.projectId,
          supportProjectId: support.projectId,
        },
      });
    }
    return { created: Boolean(created) };
  });
}

export async function addDraftSupportingNoteVersion(
  actor: Principal,
  input: { draftId: string; noteVersionId: string },
) {
  return db.transaction(async (tx) => {
    const draft = await requireOwnedProjectDraft(tx, actor, input.draftId);
    const support = await requireSupportingNoteVersion(tx, actor, input.noteVersionId);
    if (draft.nodeId && draft.nodeId === support.nodeId) {
      throw new ApiError(400, "self_support", "A Note cannot support itself.");
    }
    const [created] = await tx
      .insert(draftSupportNoteVersions)
      .values({ ...input, createdBy: actor.userId })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "node.support.note.add",
        targetType: "node_draft",
        targetId: draft.id,
        details: {
          noteVersionId: support.noteVersionId,
          targetProjectId: draft.projectId,
          supportProjectId: support.projectId,
        },
      });
    }
    return { created: Boolean(created) };
  });
}

export async function removeDraftSupportingSourceVersion(
  actor: Principal,
  input: { draftId: string; sourceVersionId: string },
) {
  return db.transaction(async (tx) => {
    const draft = await requireOwnedProjectDraft(tx, actor, input.draftId);
    const removed = await tx
      .delete(draftSupportSourceVersions)
      .where(
        and(
          eq(draftSupportSourceVersions.draftId, input.draftId),
          eq(draftSupportSourceVersions.sourceVersionId, input.sourceVersionId),
        ),
      )
      .returning();
    if (removed.length) {
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "node.support.source.remove",
        targetType: "node_draft",
        targetId: draft.id,
        details: { sourceVersionId: input.sourceVersionId, targetProjectId: draft.projectId },
      });
    }
    return { removed: removed.length > 0 };
  });
}

export async function removeDraftSupportingNoteVersion(
  actor: Principal,
  input: { draftId: string; noteVersionId: string },
) {
  return db.transaction(async (tx) => {
    const draft = await requireOwnedProjectDraft(tx, actor, input.draftId);
    const removed = await tx
      .delete(draftSupportNoteVersions)
      .where(
        and(
          eq(draftSupportNoteVersions.draftId, input.draftId),
          eq(draftSupportNoteVersions.noteVersionId, input.noteVersionId),
        ),
      )
      .returning();
    if (removed.length) {
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "node.support.note.remove",
        targetType: "node_draft",
        targetId: draft.id,
        details: { noteVersionId: input.noteVersionId, targetProjectId: draft.projectId },
      });
    }
    return { removed: removed.length > 0 };
  });
}

export async function listDraftSupportingResearch(actor: Principal, draftId: string) {
  await requireOwnedProjectDraft(db, actor, draftId);
  const visibleProjects = await researchReadableProjectIds(actor);
  const [sourceRows, noteRows] = await Promise.all([
    db
      .select({
        sourceVersionId: sourceVersions.id,
        sourceId: sources.id,
        title: sources.title,
        seq: sourceVersions.seq,
        projectId: projects.projectId,
      })
      .from(draftSupportSourceVersions)
      .innerJoin(sourceVersions, eq(sourceVersions.id, draftSupportSourceVersions.sourceVersionId))
      .innerJoin(sources, eq(sources.id, sourceVersions.sourceId))
      .innerJoin(projects, eq(projects.projectId, sources.spaceId))
      .where(eq(draftSupportSourceVersions.draftId, draftId)),
    db
      .select({
        noteVersionId: treeNodeVersions.id,
        nodeId: treeNodes.id,
        title: treeNodes.title,
        seq: treeNodeVersions.seq,
        projectId: projects.projectId,
      })
      .from(draftSupportNoteVersions)
      .innerJoin(treeNodeVersions, eq(treeNodeVersions.id, draftSupportNoteVersions.noteVersionId))
      .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
      .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
      .where(eq(draftSupportNoteVersions.draftId, draftId)),
  ]);
  return {
    sourceVersions: sourceRows.filter((row) => visibleProjects.includes(row.projectId)),
    noteVersions: noteRows.filter((row) => visibleProjects.includes(row.projectId)),
  };
}

export async function listNoteSupportingResearch(actor: Principal, nodeId: string) {
  const [target] = await db
    .select({ projectId: projects.projectId })
    .from(treeNodes)
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .where(eq(treeNodes.id, nodeId));
  if (!target) throw notFound();
  await requireProjectResearchRead(actor, target.projectId);
  const visibleProjects = await researchReadableProjectIds(actor);
  const [sourceRows, noteRows] = await Promise.all([
    db
      .select({
        sourceVersionId: sourceVersions.id,
        sourceId: sources.id,
        title: sources.title,
        seq: sourceVersions.seq,
        projectId: projects.projectId,
      })
      .from(noteSupportSourceVersions)
      .innerJoin(sourceVersions, eq(sourceVersions.id, noteSupportSourceVersions.sourceVersionId))
      .innerJoin(sources, eq(sources.id, sourceVersions.sourceId))
      .innerJoin(projects, eq(projects.projectId, sources.spaceId))
      .where(eq(noteSupportSourceVersions.nodeId, nodeId)),
    db
      .select({
        noteVersionId: treeNodeVersions.id,
        supportingNodeId: treeNodes.id,
        title: treeNodes.title,
        seq: treeNodeVersions.seq,
        projectId: projects.projectId,
      })
      .from(noteSupportNoteVersions)
      .innerJoin(treeNodeVersions, eq(treeNodeVersions.id, noteSupportNoteVersions.noteVersionId))
      .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
      .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
      .where(eq(noteSupportNoteVersions.nodeId, nodeId)),
  ]);
  return {
    sourceVersions: sourceRows.filter((row) => visibleProjects.includes(row.projectId)),
    noteVersions: noteRows.filter((row) => visibleProjects.includes(row.projectId)),
  };
}

export async function copyOfficialSupportToDraft(tx: Tx, nodeId: string, draftId: string) {
  await tx.insert(draftSupportSourceVersions).select(
    tx
      .select({
        draftId: sql<string>`${draftId}::uuid`.as("draft_id"),
        sourceVersionId: noteSupportSourceVersions.sourceVersionId,
        createdBy: noteSupportSourceVersions.createdBy,
        createdAt: noteSupportSourceVersions.createdAt,
      })
      .from(noteSupportSourceVersions)
      .where(eq(noteSupportSourceVersions.nodeId, nodeId)),
  );
  await tx.insert(draftSupportNoteVersions).select(
    tx
      .select({
        draftId: sql<string>`${draftId}::uuid`.as("draft_id"),
        noteVersionId: noteSupportNoteVersions.noteVersionId,
        createdBy: noteSupportNoteVersions.createdBy,
        createdAt: noteSupportNoteVersions.createdAt,
      })
      .from(noteSupportNoteVersions)
      .where(eq(noteSupportNoteVersions.nodeId, nodeId)),
  );
}

export async function replaceOfficialSupportFromDraft(tx: Tx, nodeId: string, draftId: string) {
  const [sourceRows, noteRows] = await Promise.all([
    tx
      .select()
      .from(draftSupportSourceVersions)
      .where(eq(draftSupportSourceVersions.draftId, draftId)),
    tx.select().from(draftSupportNoteVersions).where(eq(draftSupportNoteVersions.draftId, draftId)),
  ]);
  await tx.delete(noteSupportSourceVersions).where(eq(noteSupportSourceVersions.nodeId, nodeId));
  await tx.delete(noteSupportNoteVersions).where(eq(noteSupportNoteVersions.nodeId, nodeId));
  if (sourceRows.length) {
    await tx.insert(noteSupportSourceVersions).values(
      sourceRows.map((row) => ({
        nodeId,
        sourceVersionId: row.sourceVersionId,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
      })),
    );
  }
  if (noteRows.length) {
    await tx.insert(noteSupportNoteVersions).values(
      noteRows.map((row) => ({
        nodeId,
        noteVersionId: row.noteVersionId,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
      })),
    );
  }
}
