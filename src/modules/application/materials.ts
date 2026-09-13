import { notFound } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import type { ExtractionMethod } from "../storage/extraction";
import {
  addProjectMaterialVersion,
  createProjectMaterial,
  getSourceVersionDownloadToken,
  getSourceDetail,
  listProjectMaterials,
  listSourceVersions,
  mySubmissions,
  renameSource,
  withdrawSource,
} from "../storage/service";
import {
  getProjectMaterialCandidateForReview,
  listMyProjectMaterialWorkingDrafts,
  listProjectMaterialLineageNotes,
  rejectCandidate,
  requestProjectMaterialExtraction,
} from "../storage/candidates";
import { getProject } from "../project/service";

function listItem(row: Awaited<ReturnType<typeof listProjectMaterials>>[number]) {
  return {
    id: row.sourceId,
    projectId: row.projectId,
    title: row.title,
    currentVersion: row.mimeType
      ? {
          mimeType: row.mimeType,
          storedAt: row.storedAt,
          extractionStatus: row.extractionStatus ?? "pending",
          hasText: row.hasText,
        }
      : null,
    physical: row.itemCode ? { itemCode: row.itemCode, status: row.physicalStatus } : null,
  };
}

export async function listAppProjectMaterials(actor: Principal, projectId: string) {
  return (await listProjectMaterials(actor, projectId)).map(listItem);
}

/** Account submissions deliberately include only Project Materials: non-Project browsing was retired. */
export async function listAppMySubmissions(actor: Principal) {
  const submissions = await mySubmissions(actor);
  const mapped = await Promise.all(
    submissions.map(async (submission) => {
      try {
        const project = await getProject(actor, submission.spaceId);
        return {
          id: submission.submissionId,
          projectId: project.id,
          projectName: project.name,
          title: submission.title,
          storageState: submission.storageState,
          extractionStatus: submission.extractionStatus,
          lastUpdatedAt: submission.lastUpdatedAt,
        };
      } catch {
        return null;
      }
    }),
  );
  return mapped.filter(
    (submission): submission is NonNullable<typeof submission> => submission !== null,
  );
}

export async function getAppProjectMaterial(
  actor: Principal,
  projectId: string,
  materialId: string,
) {
  const [project, material] = await Promise.all([
    getProject(actor, projectId),
    getSourceDetail(actor, materialId),
  ]);
  if (material.spaceId !== project.id) throw notFound();
  const [lineageNotes, workingDrafts] = await Promise.all([
    listProjectMaterialLineageNotes(actor, {
      projectId: project.id,
      sourceId: material.id,
    }),
    listMyProjectMaterialWorkingDrafts(actor, {
      projectId: project.id,
      sourceId: material.id,
    }),
  ]);
  return {
    id: material.id,
    project: { id: project.id, name: project.name },
    title: material.title,
    description: material.description,
    version: material.version,
    currentVersion: material.currentVersion
      ? {
          id: material.currentVersion.id,
          seq: material.currentVersion.seq,
          originalFilename: material.currentVersion.originalFilename,
          mimeType: material.currentVersion.mimeType,
          sizeBytes: material.currentVersion.sizeBytes,
          storageState: material.currentVersion.storageState,
          extractionStatus: material.currentVersion.extractionStatus,
          storedAt: material.currentVersion.storedAt,
          hasText: material.currentVersion.hasText,
        }
      : null,
    versions: material.versions.map((version) => ({
      id: version.id,
      seq: version.seq,
      originalFilename: version.originalFilename,
      mimeType: version.mimeType,
      sizeBytes: version.sizeBytes,
      storageState: version.storageState,
      extractionStatus: version.extractionStatus,
      storedAt: version.storedAt,
      uploadedByName: version.uploadedByName,
    })),
    lineageNotes,
    workingDrafts,
    capabilities: {
      canSteward: material.submittedBy === actor.userId || material.assignedTo === actor.userId,
    },
  };
}

export async function createAppProjectMaterial(
  actor: Principal,
  input: {
    projectId: string;
    title: string;
    description?: string | null;
    file?: File;
    extractionMethod?: ExtractionMethod;
  },
) {
  const material = await createProjectMaterial(actor, input);
  return getAppProjectMaterial(actor, input.projectId, material.id);
}

export async function addAppProjectMaterialVersion(
  actor: Principal,
  input: {
    projectId: string;
    materialId: string;
    file: File;
    extractionMethod?: ExtractionMethod;
  },
) {
  await addProjectMaterialVersion(actor, {
    projectId: input.projectId,
    sourceId: input.materialId,
    file: input.file,
    extractionMethod: input.extractionMethod,
  });
  return getAppProjectMaterial(actor, input.projectId, input.materialId);
}

/** Target Material stewardship changes metadata only; immutable versions stay untouched. */
export async function updateAppProjectMaterial(
  actor: Principal,
  input: { projectId: string; materialId: string; title?: string; description?: string | null },
) {
  await getAppProjectMaterial(actor, input.projectId, input.materialId);
  await renameSource(actor, input.materialId, {
    title: input.title,
    description: input.description,
  });
  return getAppProjectMaterial(actor, input.projectId, input.materialId);
}

/** Withdrawal is reversible storage state, never deletion of source identity or versions. */
export async function withdrawAppProjectMaterial(
  actor: Principal,
  input: { projectId: string; materialId: string },
) {
  await getAppProjectMaterial(actor, input.projectId, input.materialId);
  await withdrawSource(actor, input.materialId);
}

export const listAppMaterialVersions = listSourceVersions;

/** Target download boundary: selected version, Project, and Material must agree. */
export async function getAppProjectMaterialVersionDownloadToken(
  actor: Principal,
  input: { projectId: string; materialId: string; sourceVersionId: string },
) {
  const [project, material] = await Promise.all([
    getProject(actor, input.projectId),
    getSourceDetail(actor, input.materialId),
  ]);
  if (material.spaceId !== project.id) throw notFound();
  return getSourceVersionDownloadToken(actor, material.id, input.sourceVersionId);
}

/** Contributor-only review of machine-derived text. It intentionally omits legacy scope. */
export const getAppProjectMaterialCandidateForReview = getProjectMaterialCandidateForReview;

export async function rejectAppProjectMaterialCandidate(
  actor: Principal,
  input: { projectId: string; materialId: string; sourceVersionId: string },
) {
  const candidate = await getProjectMaterialCandidateForReview(actor, {
    projectId: input.projectId,
    sourceId: input.materialId,
    sourceVersionId: input.sourceVersionId,
  });
  await rejectCandidate(actor, candidate.candidateId);
}

export async function requestAppProjectMaterialExtraction(
  actor: Principal,
  input: {
    projectId: string;
    materialId: string;
    sourceVersionId: string;
    method: ExtractionMethod;
  },
) {
  return requestProjectMaterialExtraction(actor, {
    projectId: input.projectId,
    sourceId: input.materialId,
    sourceVersionId: input.sourceVersionId,
    method: input.method,
  });
}
