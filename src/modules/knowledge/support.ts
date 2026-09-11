import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
  noteVersionSupportNoteVersions,
  noteVersionSupportSourceVersions,
  treeNodes,
  treeNodeVersions,
} from "./schema";

type Runner = Tx | typeof db;

async function requireOwnedProjectDraft(
  runner: Runner,
  actor: Principal,
  draftId: string,
  requireEditing = true,
) {
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
  if (requireEditing && draft.node_drafts.state !== "editing") {
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
  await requireOwnedProjectDraft(db, actor, draftId, false);
  const visibleProjects = await researchReadableProjectIds(actor);
  if (!visibleProjects.length) return { sourceVersions: [], noteVersions: [] };
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
      .where(
        and(
          eq(draftSupportSourceVersions.draftId, draftId),
          inArray(projects.projectId, visibleProjects),
        ),
      ),
    db
      .select({
        noteVersionId: treeNodeVersions.id,
        nodeId: treeNodes.id,
        title: treeNodeVersions.title,
        seq: treeNodeVersions.seq,
        projectId: projects.projectId,
      })
      .from(draftSupportNoteVersions)
      .innerJoin(treeNodeVersions, eq(treeNodeVersions.id, draftSupportNoteVersions.noteVersionId))
      .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
      .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
      .where(
        and(
          eq(draftSupportNoteVersions.draftId, draftId),
          inArray(projects.projectId, visibleProjects),
        ),
      ),
  ]);
  return { sourceVersions: sourceRows, noteVersions: noteRows };
}

export async function listNoteSupportingResearch(actor: Principal, nodeId: string) {
  const [current] = await db
    .select({ id: treeNodeVersions.id })
    .from(treeNodeVersions)
    .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .where(eq(treeNodeVersions.nodeId, nodeId))
    .orderBy(desc(treeNodeVersions.seq))
    .limit(1);
  if (!current) throw notFound();
  return listNoteVersionSupportingResearch(actor, current.id);
}

/** Load canonical evidence for one exact immutable official Note version. */
export async function listNoteVersionSupportingResearch(
  actor: Principal,
  targetNoteVersionId: string,
) {
  const [target] = await db
    .select({
      projectId: projects.projectId,
      supportSnapshotComplete: treeNodeVersions.supportSnapshotComplete,
    })
    .from(treeNodeVersions)
    .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .where(eq(treeNodeVersions.id, targetNoteVersionId));
  if (!target) throw notFound();
  await requireProjectResearchRead(actor, target.projectId);
  if (!target.supportSnapshotComplete) {
    return { snapshotStatus: "unknown" as const, sourceVersions: [], noteVersions: [] };
  }
  const visibleProjects = await researchReadableProjectIds(actor);
  if (!visibleProjects.length) {
    return { snapshotStatus: "complete" as const, sourceVersions: [], noteVersions: [] };
  }
  const [sourceRows, noteRows] = await Promise.all([
    db
      .select({
        sourceVersionId: sourceVersions.id,
        sourceId: sources.id,
        title: sources.title,
        seq: sourceVersions.seq,
        projectId: projects.projectId,
      })
      .from(noteVersionSupportSourceVersions)
      .innerJoin(
        sourceVersions,
        eq(sourceVersions.id, noteVersionSupportSourceVersions.sourceVersionId),
      )
      .innerJoin(sources, eq(sources.id, sourceVersions.sourceId))
      .innerJoin(projects, eq(projects.projectId, sources.spaceId))
      .where(
        and(
          eq(noteVersionSupportSourceVersions.targetNoteVersionId, targetNoteVersionId),
          inArray(projects.projectId, visibleProjects),
        ),
      ),
    db
      .select({
        noteVersionId: treeNodeVersions.id,
        supportingNodeId: treeNodes.id,
        title: treeNodeVersions.title,
        seq: treeNodeVersions.seq,
        projectId: projects.projectId,
      })
      .from(noteVersionSupportNoteVersions)
      .innerJoin(
        treeNodeVersions,
        eq(treeNodeVersions.id, noteVersionSupportNoteVersions.supportingNoteVersionId),
      )
      .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
      .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
      .where(
        and(
          eq(noteVersionSupportNoteVersions.targetNoteVersionId, targetNoteVersionId),
          inArray(projects.projectId, visibleProjects),
        ),
      ),
  ]);
  return {
    snapshotStatus: "complete" as const,
    sourceVersions: sourceRows,
    noteVersions: noteRows,
  };
}

export async function copyOfficialSupportToDraft(tx: Tx, nodeId: string, draftId: string) {
  const [current] = await tx
    .select({ id: treeNodeVersions.id })
    .from(treeNodeVersions)
    .where(eq(treeNodeVersions.nodeId, nodeId))
    .orderBy(desc(treeNodeVersions.seq))
    .limit(1);
  if (!current) throw notFound();
  await replaceDraftSupportFromNoteVersion(tx, draftId, current.id);
}

type SnapshotSource =
  { kind: "draft"; draftId: string; nodeId: string } | { kind: "current"; nodeId: string };

/**
 * Write the canonical immutable support set for a newly inserted Note version.
 * The caller inserts an incomplete version in this same transaction; this helper seals it.
 */
export async function snapshotNoteVersionSupport(
  tx: Tx,
  targetNoteVersionId: string,
  source: SnapshotSource,
) {
  const [sourceRows, noteRows] =
    source.kind === "draft"
      ? await Promise.all([
          tx
            .select()
            .from(draftSupportSourceVersions)
            .where(eq(draftSupportSourceVersions.draftId, source.draftId)),
          tx
            .select()
            .from(draftSupportNoteVersions)
            .where(eq(draftSupportNoteVersions.draftId, source.draftId)),
        ])
      : await Promise.all([
          tx
            .select({
              sourceVersionId: noteSupportSourceVersions.sourceVersionId,
              createdBy: noteSupportSourceVersions.createdBy,
              createdAt: noteSupportSourceVersions.createdAt,
            })
            .from(noteSupportSourceVersions)
            .where(eq(noteSupportSourceVersions.nodeId, source.nodeId)),
          tx
            .select({
              noteVersionId: noteSupportNoteVersions.noteVersionId,
              createdBy: noteSupportNoteVersions.createdBy,
              createdAt: noteSupportNoteVersions.createdAt,
            })
            .from(noteSupportNoteVersions)
            .where(eq(noteSupportNoteVersions.nodeId, source.nodeId)),
        ]);

  if (sourceRows.length) {
    await tx.insert(noteVersionSupportSourceVersions).values(
      sourceRows.map((row) => ({
        targetNoteVersionId,
        sourceVersionId: row.sourceVersionId,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
      })),
    );
  }
  if (noteRows.length) {
    await tx.insert(noteVersionSupportNoteVersions).values(
      noteRows.map((row) => ({
        targetNoteVersionId,
        supportingNoteVersionId: row.noteVersionId,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
      })),
    );
  }

  if (source.kind === "draft") {
    await tx
      .delete(noteSupportSourceVersions)
      .where(eq(noteSupportSourceVersions.nodeId, source.nodeId));
    await tx
      .delete(noteSupportNoteVersions)
      .where(eq(noteSupportNoteVersions.nodeId, source.nodeId));
    if (sourceRows.length) {
      await tx.insert(noteSupportSourceVersions).values(
        sourceRows.map((row) => ({
          nodeId: source.nodeId,
          sourceVersionId: row.sourceVersionId,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
        })),
      );
    }
    if (noteRows.length) {
      await tx.insert(noteSupportNoteVersions).values(
        noteRows.map((row) => ({
          nodeId: source.nodeId,
          noteVersionId: row.noteVersionId,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
        })),
      );
    }
  }

  const [sealed] = await tx
    .update(treeNodeVersions)
    .set({ supportSnapshotComplete: true })
    .where(
      and(
        eq(treeNodeVersions.id, targetNoteVersionId),
        eq(treeNodeVersions.supportSnapshotComplete, false),
      ),
    )
    .returning({ id: treeNodeVersions.id });
  if (!sealed) {
    throw new ApiError(409, "support_snapshot_already_complete", "Note evidence is already sealed.");
  }
}

export async function replaceDraftSupportFromNoteVersion(
  tx: Tx,
  draftId: string,
  noteVersionId: string,
) {
  const [version] = await tx
    .select({ supportSnapshotComplete: treeNodeVersions.supportSnapshotComplete })
    .from(treeNodeVersions)
    .where(eq(treeNodeVersions.id, noteVersionId));
  if (!version) throw notFound();
  if (!version.supportSnapshotComplete) {
    throw new ApiError(
      409,
      "historical_support_unavailable",
      "Evidence history is unavailable for this Note version.",
    );
  }
  await tx
    .delete(draftSupportSourceVersions)
    .where(eq(draftSupportSourceVersions.draftId, draftId));
  await tx.delete(draftSupportNoteVersions).where(eq(draftSupportNoteVersions.draftId, draftId));
  await tx.insert(draftSupportSourceVersions).select(
    tx
      .select({
        draftId: sql<string>`${draftId}::uuid`.as("draft_id"),
        sourceVersionId: noteVersionSupportSourceVersions.sourceVersionId,
        createdBy: noteVersionSupportSourceVersions.createdBy,
        createdAt: noteVersionSupportSourceVersions.createdAt,
      })
      .from(noteVersionSupportSourceVersions)
      .where(eq(noteVersionSupportSourceVersions.targetNoteVersionId, noteVersionId)),
  );
  await tx.insert(draftSupportNoteVersions).select(
    tx
      .select({
        draftId: sql<string>`${draftId}::uuid`.as("draft_id"),
        noteVersionId: noteVersionSupportNoteVersions.supportingNoteVersionId,
        createdBy: noteVersionSupportNoteVersions.createdBy,
        createdAt: noteVersionSupportNoteVersions.createdAt,
      })
      .from(noteVersionSupportNoteVersions)
      .where(eq(noteVersionSupportNoteVersions.targetNoteVersionId, noteVersionId)),
  );
}
