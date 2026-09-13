"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { DraftDto } from "@/modules/application";
import {
  Button,
  Dialog,
  MarkdownView,
  ResearchContent,
  SaveStatus,
  StatusBadge,
  registerUnsavedNoteNavigationGuard,
  shouldGuardNoteAnchorNavigation,
  translate,
  type SaveState,
} from "@/app/components/ui-next";
import {
  applySuccessfulNoteSave,
  hasUnpersistedNoteWork,
  noteSaveRequest,
  type NoteSaveSnapshot,
} from "./note-editor-state";

export interface NoteEditorProps {
  projectId: string;
  projectName: string;
  locale: UiLocale;
  initialNoteId: string;
  initialDraft: DraftDto | null;
  officialNote: {
    id: string;
    title: string;
    summary: string | null;
    contentMd: string;
    researchPurpose: "evidence" | "synthesis" | null;
    currentVersion: number;
  } | null;
  onExitEdit?: () => void;
  onPublished?: (nodeId: string) => void;
  onDraftSaved?: (draft: DraftDto) => void;
  onToggleInspector: () => void;
  onToggleFocus: () => void;
  isFocusMode?: boolean;
}

export function NoteEditor({
  projectId,
  projectName,
  locale,
  initialNoteId,
  initialDraft,
  officialNote,
  onExitEdit,
  onPublished,
  onDraftSaved,
  onToggleInspector,
  onToggleFocus,
  isFocusMode,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialDraft?.title ?? officialNote?.title ?? "");
  const [summary, setSummary] = useState(initialDraft?.summary ?? officialNote?.summary ?? "");
  const [contentMd, setContentMd] = useState(
    initialDraft?.contentMd ?? officialNote?.contentMd ?? "",
  );
  const [researchPurpose, setResearchPurpose] = useState<"evidence" | "synthesis" | null>(
    initialDraft?.researchPurpose ?? officialNote?.researchPurpose ?? null,
  );

  const baseVersion = officialNote?.currentVersion ?? 1;

  const [viewMode, setViewMode] = useState<"write" | "split" | "preview">("split");
  const [saveState, setSaveState] = useState<SaveState>(
    initialDraft || officialNote ? "saved" : "unsaved",
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const changeSeqRef = useRef(0);
  const savedSeqRef = useRef(0);
  const activeSaveSeqRef = useRef(0);
  const activeSaveRef = useRef<Promise<SaveResult> | null>(null);
  const queuedSaveRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // React state renders the editor. This mutable snapshot owns request sequencing.
  const saveSnapshotRef = useRef<NoteSaveSnapshot>({
    title,
    summary,
    contentMd,
    researchPurpose,
    draftVersion: initialDraft?.version ?? 0,
    draftId: initialDraft?.id ?? null,
  });

  type SaveResult =
    | {
        ok: true;
        draftId: string;
        draftVersion: number;
        savedSequence: number;
      }
    | { ok: false; reason: "failed" | "conflict" };

  const executeSave = useCallback((): Promise<SaveResult> => {
    if (activeSaveRef.current) {
      if (changeSeqRef.current > activeSaveSeqRef.current) {
        queuedSaveRef.current = true;
      }
      return activeSaveRef.current;
    }

    queuedSaveRef.current = true;
    const run = async (): Promise<SaveResult> => {
      let result: SaveResult = { ok: false, reason: "failed" };
      while (queuedSaveRef.current) {
        queuedSaveRef.current = false;
        const request = noteSaveRequest(saveSnapshotRef.current);
        const saveSeq = changeSeqRef.current;
        activeSaveSeqRef.current = saveSeq;

        if (!request.title.trim()) {
          return { ok: false, reason: "failed" };
        }

        setSaveState("saving");
        try {
          const response = await fetch(
            `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(initialNoteId)}/draft`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: request.title.trim(),
                summary: request.summary.trim() || null,
                contentMd: request.contentMd,
                researchPurpose: request.researchPurpose,
                expectedVersion: request.draftVersion,
                baseVersion,
              }),
            },
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 409 || errorData.error === "version_conflict") {
              setSaveState("conflict");
              setShowConflictDialog(true);
              queuedSaveRef.current = false;
              return { ok: false, reason: "conflict" };
            }
            throw new Error(errorData.reason || "save_failed");
          }

          const data = (await response.json()) as { draft: DraftDto };
          // Synchronize request identity/version before another queued request can start.
          result = applySuccessfulNoteSave(saveSnapshotRef.current, data.draft, saveSeq);
          onDraftSaved?.(data.draft);
          savedSeqRef.current = Math.max(savedSeqRef.current, saveSeq);

          if (changeSeqRef.current === saveSeq) {
            setSaveState("saved");
          } else {
            setSaveState("unsaved");
            queuedSaveRef.current = true;
          }
        } catch {
          setSaveState("failed");
          queuedSaveRef.current = false;
          return { ok: false, reason: "failed" };
        }
      }
      return result;
    };

    const active = run().finally(() => {
      activeSaveRef.current = null;
    });
    activeSaveRef.current = active;
    return active;
  }, [projectId, initialNoteId, baseVersion, onDraftSaved]);

  // Debounced trigger on field change
  function markDirty() {
    changeSeqRef.current += 1;
    setSaveState("unsaved");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void executeSave();
    }, 1500);
  }

  // Warn on navigation with unsaved changes: browser tab/reload
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnpersistedNoteWork(changeSeqRef.current, savedSeqRef.current)) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(
    () =>
      registerUnsavedNoteNavigationGuard(
        window,
        () => hasUnpersistedNoteWork(changeSeqRef.current, savedSeqRef.current),
        () => window.confirm(translate(locale, "notes.unsaved.warning")),
      ),
    [locale],
  );

  // Protect client / SPA navigation while dirty without a global framework
  useEffect(() => {
    function handleCaptureClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        !hasUnpersistedNoteWork(changeSeqRef.current, savedSeqRef.current)
      ) {
        return;
      }

      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor || !anchor.href) {
        return;
      }

      if (
        !shouldGuardNoteAnchorNavigation({
          button: e.button,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          target: anchor.getAttribute("target"),
          download: anchor.hasAttribute("download"),
          href: anchor.href,
          currentHref: window.location.href,
        })
      ) {
        return;
      }

      const confirmed = window.confirm(translate(locale, "notes.unsaved.warning"));
      if (!confirmed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }

    document.addEventListener("click", handleCaptureClick, { capture: true });
    return () => document.removeEventListener("click", handleCaptureClick, { capture: true });
  }, [locale]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  async function handlePublishInternal() {
    // Flush pending changes before publish
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const publishSeq = changeSeqRef.current;
    let saved: SaveResult;
    if (
      hasUnpersistedNoteWork(changeSeqRef.current, savedSeqRef.current) ||
      !saveSnapshotRef.current.draftId
    ) {
      saved = await executeSave();
    } else {
      saved = {
        ok: true,
        draftId: saveSnapshotRef.current.draftId,
        draftVersion: saveSnapshotRef.current.draftVersion,
        savedSequence: savedSeqRef.current,
      };
    }
    if (
      !saved.ok ||
      saved.savedSequence !== publishSeq ||
      changeSeqRef.current !== publishSeq ||
      hasUnpersistedNoteWork(changeSeqRef.current, savedSeqRef.current)
    ) {
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(initialNoteId)}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId: saved.draftId }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409 || errorData.error === "version_conflict") {
          setSaveState("conflict");
          setShowConflictDialog(true);
          return;
        }
        alert(errorData.reason || translate(locale, "error.internal.title"));
        return;
      }

      const data = (await response.json()) as { nodeId: string; version: number };
      if (onPublished) {
        onPublished(data.nodeId);
      } else {
        window.location.href = `/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(data.nodeId)}`;
      }
    } catch {
      alert(translate(locale, "error.internal.title"));
    } finally {
      setIsPublishing(false);
    }
  }

  function handleCopyContent() {
    const textToCopy = `# ${title}\n\n${summary ? `> ${summary}\n\n` : ""}${contentMd}`;
    void navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function handleReloadLatest() {
    const confirmed = window.confirm(translate(locale, "notes.conflict.confirmReload"));
    if (confirmed) {
      window.location.reload();
    }
  }

  function handleSafeExitEdit() {
    if (hasUnpersistedNoteWork(changeSeqRef.current, savedSeqRef.current)) {
      const confirmed = window.confirm(translate(locale, "notes.unsaved.warning"));
      if (!confirmed) return;
    }
    if (onExitEdit) onExitEdit();
  }

  return (
    <div
      className={`ui-next-note-editor ${viewMode === "split" ? "ui-next-note-editor--split" : ""}`}
    >
      <header className="ui-next-note-editor__toolbar">
        <div className="ui-next-note-editor__toolbar-group">
          <span className="ui-next-muted">{projectName}</span>
          <StatusBadge tone="information">
            {translate(locale, "notes.inspector.privateDraftNotice")}
          </StatusBadge>
          <SaveStatus state={saveState} label={translate(locale, `saveStatus.${saveState}`)} />
          {saveState === "failed" ? (
            <Button type="button" variant="secondary" onClick={() => void executeSave()}>
              {translate(locale, "saveStatus.retry")}
            </Button>
          ) : null}
        </div>

        <div className="ui-next-note-editor__toolbar-group">
          <Button type="button" variant="secondary" onClick={onToggleFocus}>
            {translate(locale, isFocusMode ? "notes.action.exitFocus" : "notes.action.focusMode")}
          </Button>

          <Button type="button" variant="ghost" onClick={onToggleInspector}>
            {translate(locale, "notes.action.inspector")}
          </Button>

          {onExitEdit && officialNote ? (
            <Button type="button" variant="ghost" onClick={handleSafeExitEdit}>
              {translate(locale, "notes.action.read")}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="primary"
            onClick={() => void handlePublishInternal()}
            disabled={isPublishing || !title.trim()}
          >
            {isPublishing
              ? translate(locale, "notes.action.savingInternal")
              : translate(locale, "notes.action.saveInternal")}
          </Button>
        </div>
      </header>

      <div className="ui-next-note-editor__fields">
        <input
          type="text"
          className="ui-next-note-editor__title-input"
          value={title}
          onChange={(e) => {
            saveSnapshotRef.current.title = e.target.value;
            setTitle(e.target.value);
            markDirty();
          }}
          placeholder={translate(locale, "notes.field.titlePlaceholder")}
          aria-label={translate(locale, "notes.field.title")}
          required
        />

        <div className="ui-next-note-editor__purpose-row">
          <label htmlFor="note-purpose-select">{translate(locale, "notes.purpose.label")}:</label>
          <select
            id="note-purpose-select"
            className="ui-next-note-editor__purpose-select"
            value={researchPurpose ?? ""}
            onChange={(e) => {
              const val = e.target.value as "evidence" | "synthesis" | "";
              saveSnapshotRef.current.researchPurpose = val ? val : null;
              setResearchPurpose(val ? val : null);
              markDirty();
            }}
          >
            <option value="">{translate(locale, "notes.purpose.unspecified")}</option>
            <option value="evidence">{translate(locale, "notes.purpose.evidence")}</option>
            <option value="synthesis">{translate(locale, "notes.purpose.synthesis")}</option>
          </select>
        </div>

        <input
          type="text"
          className="ui-next-note-editor__summary-input"
          value={summary}
          onChange={(e) => {
            saveSnapshotRef.current.summary = e.target.value;
            setSummary(e.target.value);
            markDirty();
          }}
          placeholder={translate(locale, "notes.field.summaryPlaceholder")}
          aria-label={translate(locale, "notes.field.summary")}
        />
      </div>

      <div className="ui-next-note-editor__content-area">
        <div className="ui-next-note-editor__view-toggle">
          <Button
            type="button"
            variant={viewMode === "write" ? "primary" : "secondary"}
            aria-pressed={viewMode === "write"}
            onClick={() => setViewMode("write")}
          >
            {translate(locale, "notes.action.write")}
          </Button>
          <Button
            type="button"
            variant={viewMode === "split" ? "primary" : "secondary"}
            aria-pressed={viewMode === "split"}
            onClick={() => setViewMode("split")}
          >
            {translate(locale, "notes.action.splitView")}
          </Button>
          <Button
            type="button"
            variant={viewMode === "preview" ? "primary" : "secondary"}
            aria-pressed={viewMode === "preview"}
            onClick={() => setViewMode("preview")}
          >
            {translate(locale, "notes.action.preview")}
          </Button>
        </div>

        <div className={`ui-next-note-editor__panes ui-next-note-editor__panes--${viewMode}`}>
          {viewMode !== "preview" ? (
            <section
              className="ui-next-note-editor__pane ui-next-note-editor__pane--write"
              aria-labelledby="note-editor-write-label"
            >
              <h2 id="note-editor-write-label" className="ui-next-note-editor__pane-label">
                {translate(locale, "notes.field.content")}
              </h2>
              <textarea
                className="ui-next-note-editor__textarea"
                value={contentMd}
                onChange={(e) => {
                  saveSnapshotRef.current.contentMd = e.target.value;
                  setContentMd(e.target.value);
                  markDirty();
                }}
                placeholder={translate(locale, "notes.field.contentPlaceholder")}
                aria-labelledby="note-editor-write-label"
                dir="auto"
              />
            </section>
          ) : null}
          {viewMode !== "write" ? (
            <section
              className="ui-next-note-editor__pane ui-next-note-editor__pane--preview"
              aria-labelledby="note-editor-preview-label"
            >
              <h2 id="note-editor-preview-label" className="ui-next-note-editor__pane-label">
                {translate(locale, "notes.action.livePreview")}
              </h2>
              <ResearchContent className="ui-next-note-editor__preview" dir="auto">
                <MarkdownView content={contentMd} dir="auto" />
              </ResearchContent>
            </section>
          ) : null}
        </div>
      </div>

      <Dialog
        open={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        title={translate(locale, "notes.conflict.title")}
        description={translate(locale, "notes.conflict.description")}
        closeLabel={translate(locale, "notes.conflict.dismiss")}
      >
        <div className="ui-next-conflict-dialog">
          <p>{translate(locale, "notes.conflict.description")}</p>
          <div className="ui-next-conflict-dialog__actions">
            <Button type="button" variant="secondary" onClick={handleCopyContent}>
              {copied
                ? translate(locale, "notes.conflict.copied")
                : translate(locale, "notes.conflict.copyLocal")}
            </Button>
            <Button type="button" variant="primary" onClick={handleReloadLatest}>
              {translate(locale, "notes.conflict.reload")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
