"use client";

import { useState, useEffect } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { DraftDto } from "@/modules/application";
import type { NotePublicationStatus } from "@/modules/publication/service";
import { NoteReader } from "./note-reader";
import { NoteEditor } from "./note-editor";
import {
  NoteInspector,
  type AttachedNoteVersion,
  type AttachedSourceVersion,
} from "./note-inspector";
import { EvidencePicker, type EvidenceCandidate } from "./evidence-picker";

export interface EvidenceSet {
  snapshotStatus?: "complete" | "unknown";
  sourceVersions: AttachedSourceVersion[];
  noteVersions: AttachedNoteVersion[];
}

export interface NoteWorkspaceProps {
  projectId: string;
  projectName: string;
  locale: UiLocale;
  noteId: string;
  officialNote: {
    id: string;
    title: string;
    summary: string | null;
    contentMd: string;
    researchPurpose: "evidence" | "synthesis" | null;
    currentVersion: number;
    currentVersionId: string;
    tags?: string[];
    publication: NotePublicationStatus;
    capabilities: {
      canEdit: boolean;
      canPublish: boolean;
    };
  } | null;
  draft: DraftDto | null;
  officialEvidence?: EvidenceSet | null;
  draftEvidence?: EvidenceSet | null;
  officialProvenance?: {
    snapshotStatus: "complete" | "unknown";
    supportingMaterials: Array<{
      material: { id: string; title: string };
      materialVersion: { id: string; version: number };
      project: { id: string };
      activities: Array<{ id: string; title: string; project: { id: string; name: string }; people: Array<{ id: string; displayName: string; roleLabel: string | null }> }>;
    }>;
    supportingNotes: Array<{
      note: { id: string; title: string | null };
      noteVersion: { id: string; version: number };
      project: { id: string };
      activities: Array<{ id: string; title: string; project: { id: string; name: string }; people: Array<{ id: string; displayName: string; roleLabel: string | null }> }>;
    }>;
  } | null;
}

export function NoteWorkspace({
  projectId,
  projectName,
  locale,
  noteId,
  officialNote,
  draft,
  officialEvidence,
  draftEvidence,
  officialProvenance,
}: NoteWorkspaceProps) {
  // If official note exists, start in reader mode (unless there are active draft changes and no official note)
  const [mode, setMode] = useState<"reader" | "editor">(officialNote ? "reader" : "editor");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  // Evidence state: distinct sets for official support vs working draft support
  const [workingDraft, setWorkingDraft] = useState(draft);
  const [draftEvidenceState, setDraftEvidenceState] = useState<EvidenceSet>(
    draftEvidence || officialEvidence || { sourceVersions: [], noteVersions: [] },
  );
  const officialEvidenceState = officialEvidence || {
    sourceVersions: [],
    noteVersions: [],
  };

  const [evidencePickerOpen, setEvidencePickerOpen] = useState(false);

  useEffect(() => {
    function checkWidth() {
      setIsNarrow(window.innerWidth <= 900);
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Escape key handler: first closes open dialogs/inspector, then exits focus mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (document.querySelector("dialog[open]")) {
          return;
        }
        if (inspectorOpen) {
          setInspectorOpen(false);
        } else if (focusMode) {
          setFocusMode(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectorOpen, focusMode]);

  const isDraft = !officialNote || mode === "editor";
  const currentVersion = isDraft
    ? (workingDraft?.version ?? 0)
    : (officialNote?.currentVersion ?? 1);
  const currentPurpose = isDraft
    ? (workingDraft?.researchPurpose ?? officialNote?.researchPurpose ?? null)
    : (officialNote?.researchPurpose ?? null);

  // Invariant: Reader mode displays official evidence; editor mode displays working-draft evidence
  const activeEvidence = isDraft ? draftEvidenceState : officialEvidenceState;
  const canEditDraft = Boolean(
    isDraft && workingDraft && (officialNote ? officialNote.capabilities.canEdit : true),
  );

  function handleOpenEvidencePicker() {
    // Narrow viewport ergonomics: close Drawer first before opening EvidencePicker modal
    if (isNarrow || focusMode) {
      setInspectorOpen(false);
    }
    setEvidencePickerOpen(true);
  }

  async function handleAttachSourceVersion(
    sourceVersionId: string,
    item: EvidenceCandidate,
    seq: number,
  ) {
    const res = await fetch(
      `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/evidence/source-version`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceVersionId }),
      },
    );
    if (!res.ok) {
      throw new Error("Failed to attach source version");
    }
    setDraftEvidenceState((prev) => ({
      ...prev,
      sourceVersions: [
        ...prev.sourceVersions.filter((v) => v.sourceVersionId !== sourceVersionId),
        {
          sourceVersionId,
          sourceId: item.id,
          title: item.title,
          seq,
          projectId: item.project.id,
        },
      ],
    }));
  }

  async function handleAttachNoteVersion(
    noteVersionId: string,
    item: EvidenceCandidate,
    seq: number,
  ) {
    const res = await fetch(
      `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/evidence/note-version`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteVersionId }),
      },
    );
    if (!res.ok) {
      throw new Error("Failed to attach note version");
    }
    setDraftEvidenceState((prev) => ({
      ...prev,
      noteVersions: [
        ...prev.noteVersions.filter((v) => v.noteVersionId !== noteVersionId),
        {
          noteVersionId,
          nodeId: item.id,
          title: item.title,
          seq,
          projectId: item.project.id,
        },
      ],
    }));
  }

  async function handleRemoveSourceVersion(sourceVersionId: string) {
    const res = await fetch(
      `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/evidence/source-version?sourceVersionId=${encodeURIComponent(sourceVersionId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error("Failed to remove source version");
    }
    setDraftEvidenceState((prev) => ({
      ...prev,
      sourceVersions: prev.sourceVersions.filter((v) => v.sourceVersionId !== sourceVersionId),
    }));
  }

  async function handleRemoveNoteVersion(noteVersionId: string) {
    const res = await fetch(
      `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/evidence/note-version?noteVersionId=${encodeURIComponent(noteVersionId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error("Failed to remove note version");
    }
    setDraftEvidenceState((prev) => ({
      ...prev,
      noteVersions: prev.noteVersions.filter((v) => v.noteVersionId !== noteVersionId),
    }));
  }

  return (
    <div className={`ui-next-note-workspace ${focusMode ? "ui-next-note-workspace--focus" : ""}`}>
      <div className="ui-next-note-workspace__main">
        {mode === "reader" && officialNote ? (
          <NoteReader
            locale={locale}
            projectName={projectName}
            note={officialNote}
            canEdit={officialNote.capabilities.canEdit}
            onEditClick={() => setMode("editor")}
            onToggleInspector={() => setInspectorOpen((prev) => !prev)}
            onToggleFocus={() => setFocusMode((prev) => !prev)}
          />
        ) : (
          <NoteEditor
            projectId={projectId}
            projectName={projectName}
            locale={locale}
            initialNoteId={noteId}
            initialDraft={workingDraft}
            officialNote={officialNote}
            onExitEdit={officialNote ? () => setMode("reader") : undefined}
            onPublished={(newId) => {
              window.location.href = `/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(newId)}`;
            }}
            onDraftSaved={setWorkingDraft}
            onToggleInspector={() => setInspectorOpen((prev) => !prev)}
            onToggleFocus={() => setFocusMode((prev) => !prev)}
            isFocusMode={focusMode}
          />
        )}
      </div>

      <NoteInspector
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        locale={locale}
        projectName={projectName}
        isDraft={isDraft}
        canEditDraft={canEditDraft}
        version={currentVersion}
        officialVersion={officialNote?.currentVersion}
        researchPurpose={currentPurpose}
        publication={officialNote?.publication}
        tags={officialNote?.tags}
        isDrawer={isNarrow || focusMode}
        evidence={activeEvidence}
        provenance={isDraft ? null : officialProvenance}
        onOpenEvidencePicker={handleOpenEvidencePicker}
        onRemoveSourceVersion={handleRemoveSourceVersion}
        onRemoveNoteVersion={handleRemoveNoteVersion}
      />

      <EvidencePicker
        open={evidencePickerOpen}
        onClose={() => setEvidencePickerOpen(false)}
        locale={locale}
        projectId={projectId}
        noteId={noteId}
        onAttachSourceVersion={handleAttachSourceVersion}
        onAttachNoteVersion={handleAttachNoteVersion}
      />
    </div>
  );
}
