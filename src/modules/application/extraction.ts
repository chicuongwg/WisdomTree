import type { Principal } from "../auth/principal";
import {
  evolveCandidateIntoProjectNote,
  getProjectMaterialCandidateForReview,
  getProjectMaterialExtraction,
} from "../storage/candidates";

export const getAppProjectMaterialExtraction = getProjectMaterialExtraction;

export async function evolveAppCandidateIntoProjectNote(
  actor: Principal,
  input: { candidateId: string; title?: string },
) {
  const result = await evolveCandidateIntoProjectNote(actor, input);
  return {
    candidateId: result.candidateId,
    sourceVersionId: result.sourceVersionId,
    materialId: result.sourceId,
    draft: {
      id: result.id,
      noteId: result.nodeId,
      projectId: result.projectId!,
      title: result.title,
      summary: result.summary,
      contentMd: result.contentMd,
      researchPurpose: result.researchPurpose,
      version: result.draftVersion,
      authorPrivate: true as const,
      status: result.state,
    },
  };
}

/** Target UI derives the candidate from one Project Material version; it never posts a scope choice. */
export async function evolveAppProjectMaterialCandidateIntoNote(
  actor: Principal,
  input: { projectId: string; materialId: string; sourceVersionId: string; title?: string },
) {
  const candidate = await getProjectMaterialCandidateForReview(actor, {
    projectId: input.projectId,
    sourceId: input.materialId,
    sourceVersionId: input.sourceVersionId,
  });
  return evolveAppCandidateIntoProjectNote(actor, {
    candidateId: candidate.candidateId,
    title: input.title,
  });
}
