"use client";

import { useEffect, useState, useTransition } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  Dialog,
  StatusBadge,
  translate,
} from "@/app/components/ui-next";

export interface EvidenceCandidate {
  kind: "material" | "note";
  id: string;
  title: string;
  summary: string | null;
  project: { id: string; name: string };
}

export interface CandidateVersion {
  id: string;
  seq: number;
  filename?: string | null;
  title?: string;
  storedAt?: string | Date;
  createdAt?: string | Date;
}

export interface EvidencePickerProps {
  open: boolean;
  onClose: () => void;
  locale: UiLocale;
  projectId: string;
  noteId: string;
  onAttachSourceVersion: (sourceVersionId: string, item: EvidenceCandidate, seq: number) => Promise<void>;
  onAttachNoteVersion: (noteVersionId: string, item: EvidenceCandidate, seq: number) => Promise<void>;
}

export function EvidencePicker({
  open,
  onClose,
  locale,
  projectId,
  noteId,
  onAttachSourceVersion,
  onAttachNoteVersion,
}: EvidencePickerProps) {
  const [scope, setScope] = useState<"project" | "all">("project");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EvidenceCandidate[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected candidate for version selection (lazy version loading)
  const [selectedItem, setSelectedItem] = useState<EvidenceCandidate | null>(null);
  const [versions, setVersions] = useState<CandidateVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const [isAttaching, startAttachTransition] = useTransition();
  const [attachError, setAttachError] = useState<string | null>(null);

  // Fetch results whenever query or scope changes
  useEffect(() => {
    if (!open) return;

    let active = true;
    setIsLoadingResults(true);
    setSearchError(null);

    const timer = setTimeout(
      () => {
        const url = `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/evidence/search?scope=${encodeURIComponent(scope)}&q=${encodeURIComponent(query)}`;
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error("Search failed");
            return res.json();
          })
          .then((data: { results?: EvidenceCandidate[] }) => {
            if (active) {
              setResults(data.results || []);
              setIsLoadingResults(false);
            }
          })
          .catch(() => {
            if (active) {
              setSearchError(translate(locale, "error.internal.title"));
              setIsLoadingResults(false);
            }
          });
      },
      query ? 250 : 0,
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, scope, projectId, noteId, locale]);

  // Lazy load versions only when an item is selected
  useEffect(() => {
    if (!selectedItem) {
      setVersions([]);
      setSelectedVersionId(null);
      return;
    }

    let active = true;
    setIsLoadingVersions(true);
    setVersionError(null);

    const url = `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/evidence/versions?type=${encodeURIComponent(selectedItem.kind)}&id=${encodeURIComponent(selectedItem.id)}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load versions");
        return res.json();
      })
      .then((data: { versions?: CandidateVersion[] }) => {
        if (active) {
          const list = data.versions || [];
          setVersions(list);
          if (list.length > 0) {
            setSelectedVersionId(list[0].id);
          }
          setIsLoadingVersions(false);
        }
      })
      .catch(() => {
        if (active) {
          setVersionError(translate(locale, "error.internal.title"));
          setIsLoadingVersions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedItem, projectId, noteId, locale]);

  function handleClose() {
    setSelectedItem(null);
    setQuery("");
    setAttachError(null);
    onClose();
  }

  function handleAttach() {
    if (!selectedItem || !selectedVersionId) return;

    const chosenVersion = versions.find((v) => v.id === selectedVersionId);
    if (!chosenVersion) return;

    setAttachError(null);
    startAttachTransition(async () => {
      try {
        if (selectedItem.kind === "material") {
          await onAttachSourceVersion(selectedVersionId, selectedItem, chosenVersion.seq);
        } else {
          await onAttachNoteVersion(selectedVersionId, selectedItem, chosenVersion.seq);
        }
        handleClose();
      } catch {
        setAttachError(translate(locale, "notes.evidence.attachFailed"));
      }
    });
  }

  const materials = results.filter((r) => r.kind === "material");
  const notes = results.filter((r) => r.kind === "note");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={translate(locale, "notes.evidence.add")}
      closeLabel={translate(locale, "notes.evidence.closePicker")}
    >
      <div className="ui-next-evidence-picker">
        {!selectedItem ? (
          <>
            <div
              className="ui-next-evidence-picker__scope-group"
              role="radiogroup"
              aria-label={translate(locale, "notes.evidence.title")}
            >
              <button
                type="button"
                className={`ui-next-evidence-picker__scope-btn ${
                  scope === "project" ? "ui-next-evidence-picker__scope-btn--active" : ""
                }`}
                onClick={() => setScope("project")}
              >
                {translate(locale, "notes.evidence.scope.project")}
              </button>
              <button
                type="button"
                className={`ui-next-evidence-picker__scope-btn ${
                  scope === "all" ? "ui-next-evidence-picker__scope-btn--active" : ""
                }`}
                onClick={() => setScope("all")}
              >
                {translate(locale, "notes.evidence.scope.all")}
              </button>
            </div>

            <div className="ui-next-evidence-picker__search">
              <input
                type="search"
                className="ui-next-field ui-next-evidence-picker__search-input"
                placeholder={translate(locale, "notes.evidence.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>

            {isLoadingResults ? (
              <p className="ui-next-muted">{translate(locale, "common.loading")}</p>
            ) : searchError ? (
              <p className="ui-next-danger">{searchError}</p>
            ) : results.length === 0 ? (
              <p className="ui-next-muted">
                {query
                  ? translate(locale, "notes.evidence.noResults")
                  : translate(locale, "notes.evidence.searchPrompt")}
              </p>
            ) : (
              <div className="ui-next-evidence-picker__results">
                {materials.length > 0 ? (
                  <div className="ui-next-evidence-picker__group">
                    <h5 className="ui-next-evidence-picker__group-title">
                      {translate(locale, "notes.evidence.materials")} ({materials.length})
                    </h5>
                    <ul className="ui-next-evidence-picker__list">
                      {materials.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="ui-next-evidence-picker__item"
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="ui-next-evidence-picker__item-header">
                              <span className="ui-next-evidence-picker__item-title" dir="auto">
                                {item.title}
                              </span>
                              <StatusBadge tone="neutral">
                                {translate(locale, "notes.evidence.materials")}
                              </StatusBadge>
                            </div>
                            {item.project.name ? (
                              <span className="ui-next-muted ui-next-evidence-picker__item-project">
                                {item.project.name}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {notes.length > 0 ? (
                  <div className="ui-next-evidence-picker__group">
                    <h5 className="ui-next-evidence-picker__group-title">
                      {translate(locale, "notes.evidence.notes")} ({notes.length})
                    </h5>
                    <ul className="ui-next-evidence-picker__list">
                      {notes.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="ui-next-evidence-picker__item"
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="ui-next-evidence-picker__item-header">
                              <span className="ui-next-evidence-picker__item-title" dir="auto">
                                {item.title}
                              </span>
                              <StatusBadge tone="information">
                                {translate(locale, "notes.evidence.notes")}
                              </StatusBadge>
                            </div>
                            {item.project.name ? (
                              <span className="ui-next-muted ui-next-evidence-picker__item-project">
                                {item.project.name}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <div className="ui-next-evidence-picker__version-view">
            <div className="ui-next-evidence-picker__selected-header">
              <span className="ui-next-muted">
                {translate(
                  locale,
                  selectedItem.kind === "material"
                    ? "notes.evidence.materials"
                    : "notes.evidence.notes",
                )}
              </span>
              <h4 className="ui-next-evidence-picker__selected-title" dir="auto">
                {selectedItem.title}
              </h4>
            </div>

            <div className="ui-next-evidence-picker__version-section">
              <h5 className="ui-next-evidence-picker__group-title">
                {translate(locale, "notes.evidence.chooseVersion")}
              </h5>

              {isLoadingVersions ? (
                <p className="ui-next-muted">{translate(locale, "common.loading")}</p>
              ) : versionError ? (
                <p className="ui-next-danger">{versionError}</p>
              ) : versions.length === 0 ? (
                <p className="ui-next-muted">{translate(locale, "notes.evidence.noResults")}</p>
              ) : (
                <div className="ui-next-evidence-picker__version-list" role="radiogroup">
                  {versions.map((ver) => (
                    <label
                      key={ver.id}
                      className={`ui-next-evidence-picker__version-option ${
                        selectedVersionId === ver.id
                          ? "ui-next-evidence-picker__version-option--selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="evidence-version"
                        value={ver.id}
                        checked={selectedVersionId === ver.id}
                        onChange={() => setSelectedVersionId(ver.id)}
                      />
                      <span className="ui-next-evidence-picker__version-label">
                        <strong>v{ver.seq}</strong>
                        {ver.filename ? ` — ${ver.filename}` : null}
                        {ver.storedAt
                          ? ` · ${new Date(ver.storedAt).toLocaleDateString()}`
                          : ver.createdAt
                            ? ` · ${new Date(ver.createdAt).toLocaleDateString()}`
                            : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {attachError ? <p className="ui-next-danger">{attachError}</p> : null}

            <div className="ui-next-evidence-picker__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedItem(null)}
                disabled={isAttaching}
              >
                {translate(locale, "notes.evidence.backToResults")}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleAttach}
                disabled={!selectedVersionId || isAttaching}
              >
                {isAttaching
                  ? translate(locale, "notes.evidence.attaching")
                  : translate(locale, "notes.evidence.attachAction")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
