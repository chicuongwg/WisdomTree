import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { authorize } from "../auth/authorize";
import { requireProjectResearchRead } from "../auth/core";
import { recordAudit } from "../audit/service";
import { createProjectNoteInTransaction } from "../knowledge/drafts";
import { branches, treeNodes, treeNodeVersions } from "../knowledge/schema";
import { nodeAssociations } from "../knowledge/service-mutations";
import { projects } from "../project/schema";
import { extractionWorker, type ExtractionMethod } from "./extraction";
import { extractionCandidates, sources, sourceVersions } from "./schema";

/**
 * "Bản trích xuất của tôi": an extraction candidate is the uploader's own
 * working copy on the way into their personal branch — no review layer, just
 * ownership (admins may act for anyone).
 */
function canActOnCandidate(actor: Principal, candidate: { createdBy: string }): boolean {
  return candidate.createdBy === actor.userId || actor.role === "admin_op";
}

async function loadSourceVersion(sourceId: string, versionId: string) {
  const [row] = await db
    .select({ source: sources, version: sourceVersions })
    .from(sourceVersions)
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(and(eq(sources.id, sourceId), eq(sourceVersions.id, versionId)));
  if (!row) throw notFound();
  return row;
}

export async function requestExtraction(
  actor: Principal,
  sourceId: string,
  versionId: string,
  method: ExtractionMethod,
) {
  const row = await loadSourceVersion(sourceId, versionId);
  authorize(actor, "storage.source.manage", {
    ownerIds: [row.source.submittedBy, row.source.assignedTo],
    kind: "write",
  });
  const [existing] = await db
    .select({ id: extractionCandidates.id })
    .from(extractionCandidates)
    .where(eq(extractionCandidates.sourceVersionId, versionId));
  if (existing) {
    throw new ApiError(
      409,
      "candidate_exists",
      "This file already has an extracted Markdown candidate.",
    );
  }
  await db.transaction(async (tx) => {
    await tx
      .update(sourceVersions)
      .set({
        extractionStatus: "pending",
        extractionMeta: { requestedMethod: method },
        updatedAt: new Date(),
        version: row.version.version + 1,
      })
      .where(eq(sourceVersions.id, versionId));
    await recordAudit(tx, actor, {
      accountability: "uploader",
      action: "source.extraction.request",
      targetType: "source_version",
      targetId: versionId,
      details: { sourceId, method },
    });
  });
  extractionWorker.enqueue(versionId, method);
  return { sourceId, versionId, status: "pending" as const, method };
}

export async function listPersonalCandidates(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  return db
    .select({
      id: extractionCandidates.id,
      sourceVersionId: extractionCandidates.sourceVersionId,
      sourceId: sourceVersions.sourceId,
      title: sources.title,
      contentMd: extractionCandidates.contentMd,
      contentSha256: extractionCandidates.contentSha256,
      method: extractionCandidates.method,
      state: extractionCandidates.state,
      createdAt: extractionCandidates.createdAt,
    })
    .from(extractionCandidates)
    .innerJoin(sourceVersions, eq(extractionCandidates.sourceVersionId, sourceVersions.id))
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(
      and(
        eq(extractionCandidates.createdBy, actor.userId),
        eq(extractionCandidates.state, "pending_review"),
      ),
    )
    .orderBy(asc(extractionCandidates.createdAt));
}

export async function rejectCandidate(actor: Principal, candidateId: string) {
  const [candidate] = await db
    .select()
    .from(extractionCandidates)
    .where(eq(extractionCandidates.id, candidateId));
  if (!candidate || !canActOnCandidate(actor, candidate)) throw notFound();
  if (candidate.state !== "pending_review") {
    throw new ApiError(409, "invalid_state", "This extraction candidate has already been handled.");
  }
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(extractionCandidates)
      .set({ state: "rejected", reviewedBy: actor.userId, reviewedAt: new Date() })
      .where(
        and(
          eq(extractionCandidates.id, candidateId),
          eq(extractionCandidates.state, "pending_review"),
        ),
      )
      .returning();
    if (!updated)
      throw new ApiError(
        409,
        "invalid_state",
        "The extraction candidate has already been handled.",
      );
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "candidate.reject",
      targetType: "extraction_candidate",
      targetId: candidateId,
      details: { sourceVersionId: candidate.sourceVersionId },
    });
    return updated;
  });
}

export async function evolveCandidate(
  actor: Principal,
  candidateId: string,
  input: { branchId: string; title?: string },
) {
  const [candidate] = await db
    .select({
      candidate: extractionCandidates,
      title: sources.title,
    })
    .from(extractionCandidates)
    .innerJoin(sourceVersions, eq(extractionCandidates.sourceVersionId, sourceVersions.id))
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(eq(extractionCandidates.id, candidateId));
  if (!candidate || !canActOnCandidate(actor, candidate.candidate)) throw notFound();
  if (candidate.candidate.state !== "pending_review") {
    throw new ApiError(409, "invalid_state", "This extraction candidate has already been handled.");
  }
  const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId));
  if (
    !branch ||
    branch.archivedAt ||
    branch.scope !== "personal" ||
    branch.ownerUserId !== candidate.candidate.createdBy
  ) {
    throw notFound();
  }

  return db.transaction(async (tx) => {
    const title = input.title?.trim() || candidate.title;
    const slug = await uniqueNodeSlug(tx, title);
    const [node] = await tx
      .insert(treeNodes)
      .values({
        branchId: branch.id,
        title,
        slug,
        contentMd: candidate.candidate.contentMd,
        verification: "unverified",
        createdBy: actor.userId,
      })
      .returning();
    const associations = await nodeAssociations(tx, node.id);
    await tx.insert(treeNodeVersions).values({
      nodeId: node.id,
      seq: 1,
      contentMd: candidate.candidate.contentMd,
      verification: "unverified",
      createdBy: actor.userId,
      changeSummary: "evolved_from_extraction",
      title: node.title,
      summary: node.summary,
      sortOrder: node.sortOrder,
      tags: associations.tags,
      links: associations.links,
      publish: node.publish,
      reviewRequired: node.reviewRequired,
      snapshotComplete: true,
    });
    const [evolved] = await tx
      .update(extractionCandidates)
      .set({
        state: "evolved",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        evolvedNodeId: node.id,
      })
      .where(
        and(
          eq(extractionCandidates.id, candidateId),
          eq(extractionCandidates.state, "pending_review"),
        ),
      )
      .returning();
    if (!evolved)
      throw new ApiError(
        409,
        "invalid_state",
        "The extraction candidate has already been handled.",
      );
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "candidate.evolve",
      targetType: "tree_node",
      targetId: node.id,
      details: { candidateId, sourceVersionId: candidate.candidate.sourceVersionId },
    });
    return node;
  });
}

/** Target handoff: derive Project from Material ownership and create one private working Note. */
export async function evolveCandidateIntoProjectNote(
  actor: Principal,
  input: { candidateId?: string; title?: string },
) {
  if (!input.candidateId) {
    throw new ApiError(400, "invalid_candidate", "Extraction candidate is required.");
  }
  const candidateId = input.candidateId;

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        candidate: extractionCandidates,
        sourceVersionId: sourceVersions.id,
        sourceId: sources.id,
        projectId: projects.projectId,
        sourceTitle: sources.title,
      })
      .from(extractionCandidates)
      .innerJoin(sourceVersions, eq(extractionCandidates.sourceVersionId, sourceVersions.id))
      .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
      .innerJoin(projects, eq(sources.spaceId, projects.projectId))
      .where(eq(extractionCandidates.id, candidateId))
      .for("update");
    if (!row) throw notFound();

    // A Project outsider must not learn whether a candidate exists. A viewer
    // may see the Project but still cannot perform the contributor mutation.
    authorize(actor, "project.note.read", { spaceId: row.projectId, kind: "read" });
    if (row.candidate.state !== "pending_review") {
      throw new ApiError(409, "invalid_state", "This extraction candidate has already been handled.");
    }

    const draft = await createProjectNoteInTransaction(tx, actor, {
      projectId: row.projectId,
      title: input.title?.trim() || row.sourceTitle,
      contentMd: row.candidate.contentMd,
    });
    const [evolved] = await tx
      .update(extractionCandidates)
      .set({
        state: "evolved",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        evolvedDraftId: draft.id,
      })
      .where(
        and(
          eq(extractionCandidates.id, row.candidate.id),
          eq(extractionCandidates.state, "pending_review"),
        ),
      )
      .returning();
    if (!evolved) {
      throw new ApiError(
        409,
        "invalid_state",
        "The extraction candidate has already been handled.",
      );
    }
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "candidate.evolve_project",
      targetType: "node_draft",
      targetId: draft.id,
      details: {
        candidateId: row.candidate.id,
        sourceVersionId: row.sourceVersionId,
        sourceId: row.sourceId,
        projectId: row.projectId,
        draftId: draft.id,
      },
    });
    return {
      ...draft,
      candidateId: row.candidate.id,
      sourceVersionId: row.sourceVersionId,
      sourceId: row.sourceId,
    };
  });
}

/** Target Material extraction state without legacy Personal evolution controls. */
export async function getProjectMaterialExtraction(
  actor: Principal,
  input: { projectId: string; sourceId: string },
) {
  await requireProjectResearchRead(actor, input.projectId);
  const [row] = await db
    .select({
      sourceId: sources.id,
      projectId: projects.projectId,
      sourceVersionId: sourceVersions.id,
      extractionStatus: sourceVersions.extractionStatus,
      candidateId: extractionCandidates.id,
      candidateState: extractionCandidates.state,
      method: extractionCandidates.method,
      evolvedDraftId: extractionCandidates.evolvedDraftId,
      evolvedNodeId: extractionCandidates.evolvedNodeId,
    })
    .from(sources)
    .innerJoin(projects, eq(projects.projectId, sources.spaceId))
    .leftJoin(sourceVersions, eq(sourceVersions.id, sources.currentVersionId))
    .leftJoin(extractionCandidates, eq(extractionCandidates.sourceVersionId, sourceVersions.id))
    .where(and(eq(sources.id, input.sourceId), eq(projects.projectId, input.projectId)));
  if (!row) throw notFound();
  return row;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function uniqueNodeSlug(tx: Tx, title: string): Promise<string> {
  const base =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "trang";
  for (let suffix = 0; ; suffix++) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const [taken] = await tx
      .select({ id: treeNodes.id })
      .from(treeNodes)
      .where(eq(treeNodes.slug, candidate));
    if (!taken) return candidate;
  }
}
