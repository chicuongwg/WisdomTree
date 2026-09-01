import type { Principal } from "../auth/principal";
import {
  createProjectNote,
  getDraft,
  getMyNodeDraft,
  getProjectNote,
  listProjectNotes,
  publishDraft,
  saveNodeDraft,
  updateDraft,
  updateProjectDraftPurpose,
  type DraftSnapshot,
  type ResearchPurpose,
} from "../knowledge/service";
import {
  addDraftSupportingNoteVersion,
  addDraftSupportingSourceVersion,
  listDraftSupportingResearch,
  listNoteSupportingResearch,
  removeDraftSupportingNoteVersion,
  removeDraftSupportingSourceVersion,
} from "../knowledge/support";
import { getNotePublicationStatus } from "../publication/service";
import { getProject, getProjectApplicationAccess } from "../project/service";
import type { DraftDto } from "./dto";

function draftDto(draft: {
  id: string;
  nodeId: string | null;
  projectId: string | null;
  title: string;
  summary: string | null;
  contentMd?: string;
  researchPurpose: "evidence" | "synthesis" | null;
  draftVersion: number;
  state: string;
}): DraftDto {
  if (!draft.projectId) throw new Error("Target Project draft is missing Project ownership.");
  return {
    id: draft.id,
    noteId: draft.nodeId,
    projectId: draft.projectId,
    title: draft.title,
    summary: draft.summary,
    ...(draft.contentMd !== undefined ? { contentMd: draft.contentMd } : {}),
    researchPurpose: draft.researchPurpose,
    version: draft.draftVersion,
    authorPrivate: true,
    status: draft.state,
  };
}

export async function listAppProjectNotes(actor: Principal, projectId: string) {
  const result = await listProjectNotes(actor, projectId);
  return {
    notes: result.notes.map((note) => ({
      id: note.id,
      projectId: note.projectId!,
      title: note.title,
      summary: note.summary,
      researchPurpose: note.researchPurpose,
      currentVersion: note.version,
      updatedAt: note.updatedAt,
    })),
    drafts: result.drafts.map(draftDto),
  };
}

export async function getAppProjectNote(actor: Principal, projectId: string, noteId: string) {
  const [note, publication, access, project] = await Promise.all([
    getProjectNote(actor, projectId, noteId),
    getNotePublicationStatus(actor, projectId, noteId),
    getProjectApplicationAccess(actor, projectId),
    getProject(actor, projectId),
  ]);
  return {
    id: note.id,
    project: { id: project.id, name: project.name },
    title: note.title,
    summary: note.summary,
    contentMd: note.contentMd,
    researchPurpose: note.researchPurpose,
    currentVersion: note.currentVersion,
    tags: note.tags,
    publication,
    capabilities: {
      canEdit: access.capabilities.canCreateNote,
      canPublish: access.capabilities.canPublish,
    },
  };
}

export async function getAppDraft(actor: Principal, draftId: string) {
  return draftDto(await getDraft(actor, draftId));
}

export async function createAppProjectNote(
  actor: Principal,
  input: {
    projectId: string;
    title: string;
    contentMd: string;
    summary?: string | null;
    tags?: string[];
    researchPurpose?: ResearchPurpose | null;
  },
) {
  return draftDto(await createProjectNote(actor, input));
}

export async function updateAppDraft(
  actor: Principal,
  draftId: string,
  input: DraftSnapshot & { expectedVersion: number },
) {
  return draftDto(
    await updateDraft(actor, draftId, { ...input, expectedDraftVersion: input.expectedVersion }),
  );
}

export async function saveAppNoteDraft(
  actor: Principal,
  input: {
    projectId: string;
    noteId: string;
    title: string;
    summary?: string | null;
    contentMd: string;
    tags?: string[];
    baseVersion: number;
    expectedVersion: number;
  },
) {
  await getProjectNote(actor, input.projectId, input.noteId);
  const draft = await saveNodeDraft(actor, input.noteId, "vi", {
    title: input.title,
    summary: input.summary,
    contentMd: input.contentMd,
    sortOrder: 0,
    tags: input.tags ?? [],
    links: [],
    baseVersion: input.baseVersion,
    expectedDraftVersion: input.expectedVersion,
  });
  return draftDto(draft);
}

export async function getAppNoteWorkingState(
  actor: Principal,
  projectId: string,
  noteId: string,
) {
  await getProjectNote(actor, projectId, noteId);
  const state = await getMyNodeDraft(actor, noteId, "vi");
  return {
    draft: state.draft ? draftDto(state.draft) : null,
    officialVersion: state.officialVersion,
    official: state.official,
    baseContent: state.baseContent,
  };
}

export async function updateAppDraftPurpose(
  actor: Principal,
  input: {
    draftId: string;
    researchPurpose: ResearchPurpose | null;
    expectedVersion: number;
  },
) {
  return draftDto(
    await updateProjectDraftPurpose(actor, {
      draftId: input.draftId,
      researchPurpose: input.researchPurpose,
      expectedDraftVersion: input.expectedVersion,
    }),
  );
}

export const publishAppDraft = publishDraft;
export const addAppDraftSupportingSourceVersion = addDraftSupportingSourceVersion;
export const addAppDraftSupportingNoteVersion = addDraftSupportingNoteVersion;
export const removeAppDraftSupportingSourceVersion = removeDraftSupportingSourceVersion;
export const removeAppDraftSupportingNoteVersion = removeDraftSupportingNoteVersion;
export const listAppDraftSupportingResearch = listDraftSupportingResearch;
export const listAppNoteSupportingResearch = listNoteSupportingResearch;
