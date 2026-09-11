import { notFound } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import type { ExtractionMethod } from "../storage/extraction";
import {
  addProjectMaterialVersion,
  createProjectMaterial,
  getDownloadToken,
  getSourceDetail,
  listProjectMaterials,
  listSourceVersions,
} from "../storage/service";
import {
  getProjectMaterialCandidateForReview,
  listProjectMaterialLineageNotes,
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
  const lineageNotes = await listProjectMaterialLineageNotes(actor, {
    projectId: project.id,
    sourceId: material.id,
  });
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
      extractionStatus: version.extractionStatus,
      storedAt: version.storedAt,
      uploadedByName: version.uploadedByName,
    })),
    lineageNotes,
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

export const getAppMaterialDownloadToken = getDownloadToken;
export const listAppMaterialVersions = listSourceVersions;

/** Contributor-only review of machine-derived text. It intentionally omits legacy scope. */
export const getAppProjectMaterialCandidateForReview = getProjectMaterialCandidateForReview;

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
