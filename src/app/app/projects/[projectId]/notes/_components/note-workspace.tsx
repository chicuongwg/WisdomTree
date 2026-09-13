"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseBlocks } from "@/lib/markdown-core";
import { normalizeTitle } from "@/lib/wikilink";
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
import { CollaborationSection } from "@/app/components/ui-next/collaboration-section";
import { Button, translate } from "@/app/components/ui-next";
import { NoteHistory } from "./note-history";

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
  collaboration?: { mentionCandidates: Array<{ id: string; displayName: string }> } | null;
  promotionTargets?: Array<{ id: string; name: string }>;
  navigation?: {
    links: Array<{ id: string; title: string }>;
    backlinks: Array<{ id: string; title: string }>;
    previous: { id: string; title: string } | null;
    next: { id: string; title: string } | null;
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
      activities: Array<{
        id: string;
        title: string;
        project: { id: string; name: string };
        people: Array<{ id: string; displayName: string; roleLabel: string | null }>;
      }>;
    }>;
    supportingNotes: Array<{
      note: { id: string; title: string | null };
      noteVersion: { id: string; version: number };
      project: { id: string };
      activities: Array<{
        id: string;
        title: string;
        project: { id: string; name: string };
        people: Array<{ id: string; displayName: string; roleLabel: string | null }>;
      }>;
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
  collaboration,
  promotionTargets = [],
  navigation,
}: NoteWorkspaceProps) {
  const router = useRouter();
  // If official note exists, start in reader mode (unless there are active draft changes and no official note)
  const [mode, setMode] = useState<"reader" | "editor">(officialNote ? "reader" : "editor");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const tableOfContents = officialNote
    ? parseBlocks(officialNote.contentMd)
        .filter((block) => block.type === "heading")
        .map((block) => ({
          level: block.level,
          text: block.text,
          id: normalizeTitle(block.text).replace(/\s+/g, "-"),
        }))
    : [];

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
        {mode === "reader" && officialNote && collaboration ? (
          <CollaborationSection
            locale={locale}
            members={collaboration.mentionCandidates}
            commentsUrl={`/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(officialNote.id)}/comments`}
            presenceUrl={`/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(officialNote.id)}/presence`}
          />
        ) : null}
        {mode === "reader" && officialNote && navigation ? (
          <section
            className="ui-next-note-navigation"
            aria-label={translate(locale, "notes.navigation.label")}
          >
            {tableOfContents.length ? (
              <>
                <h2>{translate(locale, "notes.navigation.contents")}</h2>
                <ol>
                  {tableOfContents.map((heading) => (
                    <li key={heading.id} data-level={heading.level}>
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            <h2>{translate(locale, "notes.navigation.links")}</h2>
            {navigation.links.length ? (
              <ul>
                {navigation.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(link.id)}`}
                    >
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ui-next-muted">{translate(locale, "notes.navigation.linksEmpty")}</p>
            )}
            <h2>{translate(locale, "notes.navigation.backlinks")}</h2>
            {navigation.backlinks.length ? (
              <ul>
                {navigation.backlinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(link.id)}`}
                    >
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ui-next-muted">
                {translate(locale, "notes.navigation.backlinksEmpty")}
              </p>
            )}
            {navigation.previous || navigation.next ? (
              <nav aria-label={translate(locale, "notes.navigation.adjacent")}>
                {navigation.previous ? (
                  <a
                    href={`/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(navigation.previous.id)}`}
                  >
                    {translate(locale, "notes.navigation.previous", {
                      title: navigation.previous.title,
                    })}
                  </a>
                ) : null}
                {navigation.next ? (
                  <a
                    href={`/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(navigation.next.id)}`}
                  >
                    {translate(locale, "notes.navigation.next", { title: navigation.next.title })}
                  </a>
                ) : null}
              </nav>
            ) : null}
          </section>
        ) : null}
        {mode === "reader" && officialNote && promotionTargets.length ? (
          <NotePromotion
            projectId={projectId}
            noteId={officialNote.id}
            targets={promotionTargets}
            locale={locale}
          />
        ) : null}
        {mode === "reader" && officialNote ? (
          <NoteHistory
            projectId={projectId}
            noteId={officialNote.id}
            canRestore={officialNote.capabilities.canEdit}
            locale={locale}
          />
        ) : null}
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
        projectId={projectId}
        noteId={officialNote?.id}
        canPublish={officialNote?.capabilities.canPublish}
        onPublicationUpdated={() => router.refresh()}
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

function NotePromotion({
  projectId,
  noteId,
  targets,
  locale,
}: {
  projectId: string;
  noteId: string;
  targets: Array<{ id: string; name: string }>;
  locale: UiLocale;
}) {
  const router = useRouter();
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function promote() {
    setError(null);
    const response = await fetch(
      `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/promote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProjectId: targetId }),
      },
    );
    if (!response.ok) {
      setError(translate(locale, "notes.promotion.failed"));
      return;
    }
    const { draft } = (await response.json()) as { draft: { id: string; projectId: string } };
    router.push(
      `/app/projects/${encodeURIComponent(draft.projectId)}/notes/${encodeURIComponent(draft.id)}`,
    );
  }

  return (
    <section className="ui-next-note-promotion" aria-labelledby="note-promotion-title">
      <h2 id="note-promotion-title">{translate(locale, "notes.promotion.title")}</h2>
      <select
        className="ui-next-control"
        value={targetId}
        onChange={(event) => setTargetId(event.target.value)}
      >
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.name}
          </option>
        ))}
      </select>
      <Button type="button" variant="primary" onClick={() => void promote()}>
        {translate(locale, "notes.promotion.submit")}
      </Button>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
