import { notFound } from "next/navigation";
import {
  getAppDraft,
  getAppNoteWorkingState,
  getAppProjectNote,
  getAppProjectNoteNavigation,
  listAppProjects,
  listAppDraftSupportingResearch,
  listAppNoteVersionSupportingResearch,
  getAppNoteResearchProvenance,
  getAppCollaborationContext,
  toApplicationError,
} from "@/modules/application";
import { requireProjectModule } from "../../_lib/workspace-context";
import { NoteWorkspace } from "../_components/note-workspace";

export default async function ProjectNoteDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; noteId: string }>;
}) {
  const { projectId, noteId } = await params;
  const { actor, application, workspace } = await requireProjectModule(projectId, "notes");

  let officialNote: Awaited<ReturnType<typeof getAppProjectNote>> | null = null;
  let draft: Awaited<ReturnType<typeof getAppDraft>> | null = null;
  let officialEvidence: Awaited<ReturnType<typeof listAppNoteVersionSupportingResearch>> | null =
    null;
  let draftEvidence: Awaited<ReturnType<typeof listAppDraftSupportingResearch>> | null = null;
  let officialProvenance: Awaited<ReturnType<typeof getAppNoteResearchProvenance>> | null = null;
  let collaboration: Awaited<ReturnType<typeof getAppCollaborationContext>> | null = null;
  let promotionTargets: Array<{ id: string; name: string }> = [];
  let navigation: Awaited<ReturnType<typeof getAppProjectNoteNavigation>> | null = null;

  try {
    officialNote = await getAppProjectNote(actor, projectId, noteId);
    navigation = await getAppProjectNoteNavigation(actor, { projectId, noteId });
    if (workspace.project.personalOwnerId) {
      promotionTargets = (await listAppProjects(actor))
        .filter((project) => !project.personalOwnerId && project.capabilities.canCreateNote)
        .map((project) => ({ id: project.id, name: project.name }));
    }
    officialEvidence = await listAppNoteVersionSupportingResearch(
      actor,
      officialNote.currentVersionId,
    );
    officialProvenance = await getAppNoteResearchProvenance(actor, officialNote.currentVersionId);
    try {
      collaboration = await getAppCollaborationContext(actor, {
        kind: "note",
        projectId,
        entityId: officialNote.id,
      });
    } catch (error) {
      if (toApplicationError(error).error !== "not_found") throw error;
    }
    if (officialNote.capabilities.canEdit) {
      const workingState = await getAppNoteWorkingState(actor, projectId, noteId);
      draft = workingState.draft;
      if (draft) {
        draftEvidence = await listAppDraftSupportingResearch(actor, draft.id);
      }
    }
  } catch (err) {
    const appErr = toApplicationError(err);
    if (appErr.error !== "not_found") {
      notFound();
    }
  }

  // If no official note was found with this ID, check if noteId is a standalone author-private draft
  if (!officialNote) {
    try {
      const standaloneDraft = await getAppDraft(actor, noteId);
      if (standaloneDraft.projectId !== projectId) {
        notFound();
      }
      draft = standaloneDraft;
      draftEvidence = await listAppDraftSupportingResearch(actor, draft.id);
    } catch {
      notFound();
    }
  }

  return (
    <NoteWorkspace
      projectId={projectId}
      projectName={workspace.project.name}
      locale={application.locale}
      noteId={noteId}
      officialNote={officialNote}
      draft={draft}
      officialEvidence={officialEvidence}
      draftEvidence={draftEvidence}
      officialProvenance={officialProvenance}
      collaboration={collaboration}
      promotionTargets={promotionTargets}
      navigation={navigation}
    />
  );
}
