import { ApiError, notFound } from "@/lib/errors";
import type { Principal } from "@/modules/auth/principal";
import {
  getAppDraft,
  getAppNoteWorkingState,
  getAppProjectNote,
  toApplicationError,
} from "@/modules/application";

/**
 * Resolves an existing, author-owned working draft for the target note or draft ID.
 * CRITICAL INVARIANT: This function NEVER creates a draft.
 * If no author working draft exists, throws 404 (not_found).
 */
export async function resolveExistingTargetDraft(
  actor: Principal,
  projectId: string,
  noteId: string,
): Promise<{ draftId: string }> {
  // Check if noteId is an official Note in this project
  try {
    const officialNote = await getAppProjectNote(actor, projectId, noteId);
    if (officialNote) {
      const workingState = await getAppNoteWorkingState(actor, projectId, noteId);
      if (!workingState.draft) {
        throw new ApiError(404, "not_found", "No working draft found for this Note.");
      }
      return { draftId: workingState.draft.id };
    }
  } catch (err) {
    const appErr = toApplicationError(err);
    if (appErr.error !== "not_found") {
      throw err;
    }
  }

  // Check if noteId is a standalone draft in this project
  try {
    const standaloneDraft = await getAppDraft(actor, noteId);
    if (standaloneDraft.projectId !== projectId) {
      throw notFound();
    }
    return { draftId: standaloneDraft.id };
  } catch (err) {
    const appErr = toApplicationError(err);
    if (appErr.error !== "not_found") {
      throw err;
    }
    throw notFound();
  }
}
