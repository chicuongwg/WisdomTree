import type { DraftDto } from "@/modules/application";

export type NoteSaveSnapshot = {
  title: string;
  summary: string;
  contentMd: string;
  researchPurpose: "evidence" | "synthesis" | null;
  draftVersion: number;
  draftId: string | null;
};

export function noteSaveRequest(snapshot: NoteSaveSnapshot) {
  return { ...snapshot };
}

export function applySuccessfulNoteSave(
  snapshot: NoteSaveSnapshot,
  draft: DraftDto,
  savedSequence: number,
) {
  snapshot.draftId = draft.id;
  snapshot.draftVersion = draft.version;
  return {
    ok: true as const,
    draftId: draft.id,
    draftVersion: draft.version,
    savedSequence,
  };
}

export function hasUnpersistedNoteWork(changeSequence: number, savedSequence: number) {
  return changeSequence > savedSequence;
}
