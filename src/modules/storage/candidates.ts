import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize } from "../auth/authorize";
import { recordAudit } from "../audit/service";
import { branches, treeNodes, treeNodeVersions } from "../knowledge/schema";
import { extractionWorker, type ExtractionMethod } from "./extraction";
import { extractionCandidates, sources, sourceVersions } from "./schema";

function canReviewVault(actor: Principal, vaultId: string): boolean {
  const grant = actor.vaultGrants?.find((item) => item.vaultId === vaultId)?.grant;
  return grant === "owner" || grant === "editor" || grant === "reviewer";
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
    throw new ApiError(409, "candidate_exists", "Tệp này đã có bản Markdown chờ duyệt.");
  }
  await db
    .update(sourceVersions)
    .set({
      extractionStatus: "pending",
      extractionMeta: { requestedMethod: method },
      updatedAt: new Date(),
      version: row.version.version + 1,
    })
    .where(eq(sourceVersions.id, versionId));
  extractionWorker.enqueue(versionId, method);
  return { sourceId, versionId, status: "pending" as const, method };
}

export async function listPersonalCandidates(actor: Principal) {
  authorize(actor, "knowledge.node.read", { kind: "read" });
  if (!actor.vaultIds?.length) return [];
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
        inArray(extractionCandidates.vaultId, actor.vaultIds),
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
  if (!candidate || !canReviewVault(actor, candidate.vaultId)) throw notFound();
  if (candidate.state !== "pending_review") {
    throw new ApiError(409, "invalid_state", "Bản trích xuất này đã được xử lý.");
  }
  const [updated] = await db
    .update(extractionCandidates)
    .set({ state: "rejected", reviewedBy: actor.userId, reviewedAt: new Date() })
    .where(
      and(
        eq(extractionCandidates.id, candidateId),
        eq(extractionCandidates.state, "pending_review"),
      ),
    )
    .returning();
  return updated;
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
  if (!candidate || !canReviewVault(actor, candidate.candidate.vaultId)) throw notFound();
  if (candidate.candidate.state !== "pending_review") {
    throw new ApiError(409, "invalid_state", "Bản trích xuất này đã được xử lý.");
  }
  const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId));
  if (
    !branch ||
    branch.archivedAt ||
    branch.scope !== "personal" ||
    branch.vaultId !== candidate.candidate.vaultId
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
    await tx.insert(treeNodeVersions).values({
      nodeId: node.id,
      seq: 1,
      contentMd: candidate.candidate.contentMd,
      verification: "unverified",
      createdBy: actor.userId,
      changeSummary: "Evolve từ bản Markdown đã trích xuất và duyệt",
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
    if (!evolved) throw new ApiError(409, "invalid_state", "Bản trích xuất đã được xử lý.");
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
