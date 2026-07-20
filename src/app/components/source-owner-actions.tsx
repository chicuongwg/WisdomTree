"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { ConfirmButton } from "./confirm-button";
import { Say } from "./say";

/**
 * What the submitter can do about their own upload: fix the label, or take it
 * back. Before this existed a mistyped title or the wrong file was permanent
 * and public — the one thing a spreadsheet has always let people undo.
 *
 * Withdrawing is not a delete: the item leaves the library and stops being
 * downloadable, the bytes and the audit trail stay. The server refuses once an
 * editor or a published page depends on it, and says so.
 */
export function SourceOwnerActions({
  sourceId,
  title,
  description,
}: {
  sourceId: string;
  title: string;
  description: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextTitle, setNextTitle] = useState(title);
  const [nextDescription, setNextDescription] = useState(description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/source/${sourceId}`, {
      method,
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    if (method === "DELETE") {
      router.push("/library");
      router.refresh();
      return;
    }
    setOpen(false);
    // Refresh before releasing the button, so it cannot be fired twice against
    // the state the screen is still showing.
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="panel">
      <h2>{T.sourceOwnerActions}</h2>
      <Say error={error} />

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void call("PATCH", { title: nextTitle, description: nextDescription || null });
          }}
        >
          <div className="field">
            <label htmlFor="src-title">{T.title}</label>
            <input
              id="src-title"
              type="text"
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="src-description">{T.description}</label>
            <textarea
              id="src-description"
              rows={3}
              value={nextDescription}
              onChange={(e) => setNextDescription(e.target.value)}
            />
          </div>
          <div className="button-row">
            <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={busy}>
              {T.cancel}
            </button>
            <button type="submit" disabled={busy || !nextTitle.trim()}>
              {busy ? T.loading : T.save}
            </button>
          </div>
        </form>
      ) : (
        <div className="button-row">
          <button type="button" className="secondary" onClick={() => setOpen(true)} disabled={busy}>
            {T.renameSource}
          </button>
          <ConfirmButton
            className="danger"
            disabled={busy}
            label={T.withdrawSource}
            title={T.withdrawSourceTitle}
            body={T.withdrawSourceBody}
            confirmLabel={T.withdrawSource}
            onConfirm={() => void call("DELETE")}
          />
        </div>
      )}
    </div>
  );
}
