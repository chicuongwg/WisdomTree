"use client";

import { useEffect, useState } from "react";
import { Button, StatusBadge, translate } from "@/app/components/ui-next";
import type { UiLocale } from "@/modules/auth/profile";

type Version = {
  seq: number;
  title: string | null;
  createdAt: string;
  supportSnapshotComplete: boolean;
};
type Detail = {
  contentMd: string;
  diff: Array<{ kind: "same" | "add" | "del"; text: string }>;
};

export function NoteHistory({
  projectId,
  noteId,
  canRestore,
  locale,
}: {
  projectId: string;
  noteId: string;
  canRestore: boolean;
  locale: UiLocale;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(
      `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/history`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("history_unavailable");
        return (await response.json()) as { versions: Version[] };
      })
      .then((result) => setVersions(result.versions))
      .catch(() => setError(translate(locale, "notes.history.unavailable")));
  }, [locale, projectId, noteId]);

  async function selectVersion(seq: number) {
    setSelected(seq);
    setDetail(null);
    setError(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/history/${seq}`,
      );
      if (!response.ok) throw new Error("version_unavailable");
      const result = (await response.json()) as { version: Detail };
      setDetail(result.version);
    } catch {
      setError(translate(locale, "notes.history.versionUnavailable"));
    }
  }

  async function restore() {
    if (!selected) return;
    setError(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/history/${selected}`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("restore_failed");
      window.location.reload();
    } catch {
      setError(translate(locale, "notes.history.restoreFailed"));
    }
  }

  return (
    <section className="ui-next-note-history" aria-labelledby="note-history-title">
      <h2 id="note-history-title">{translate(locale, "notes.history.title")}</h2>
      {versions === null ? (
        <p className="ui-next-muted">{translate(locale, "notes.history.loading")}</p>
      ) : versions.length === 0 ? (
        <p className="ui-next-muted">{translate(locale, "notes.history.empty")}</p>
      ) : (
        <ul>
          {versions.map((version) => (
            <li key={version.seq}>
              <Button type="button" variant="ghost" onClick={() => void selectVersion(version.seq)}>
                v{version.seq} · {version.title || translate(locale, "notes.history.untitled")}
              </Button>
              {!version.supportSnapshotComplete ? (
                <StatusBadge tone="warning">
                  {translate(locale, "notes.history.evidenceUnknown")}
                </StatusBadge>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {detail ? (
        <>
          <pre aria-label={translate(locale, "notes.history.diff")}>
            {detail.diff.map(
              (line) =>
                `${line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "} ${line.text}\n`,
            )}
          </pre>
          {canRestore ? (
            <Button type="button" variant="secondary" onClick={() => void restore()}>
              {translate(locale, "notes.history.restore")}
            </Button>
          ) : null}
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
