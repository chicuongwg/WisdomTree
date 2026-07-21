"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

type Props = {
  sourceId: string;
  versionId: string;
  curationState: string | null;
  correctedLatest: string;
  draft: { contentMd: string; suggestedBranchId: string | null; version: number } | null;
  branches: Array<{ id: string; name: string }>;
  readOnly: boolean;
};

/**
 * Assigned Source Task workbench: corrected-text append chain, Markdown-draft
 * save (optimistic-locked; stale saves surface the contract 409), and the
 * ready-for-review transition. Approve/publish stays on the Admin/Op side.
 */
export function CurationWorkbench(props: Props) {
  const m = useMutation();
  const [corrected, setCorrected] = useState(props.correctedLatest);
  const [draftMd, setDraftMd] = useState(props.draft?.contentMd ?? "");
  const [branchId, setBranchId] = useState(props.draft?.suggestedBranchId ?? "");
  const [draftVersion, setDraftVersion] = useState(props.draft?.version ?? null);

  const base = `/api/source/${props.sourceId}/version/${props.versionId}`;
  const active = !props.readOnly && props.curationState === "under_correction";
  /**
   * Why the controls are dead, when they are.
   *
   * Every field on this screen simply stopped responding and said nothing —
   * the only clue was a badge in the page header, which is not where anyone
   * looks after clicking a textarea that will not take their text. A disabled
   * form owes the reader the reason.
   */
  const frozenBecause = active
    ? null
    : props.readOnly
      ? T.curationNotYours
      : T.curationNotUnderCorrection;

  async function saveDraft() {
    const saved = await m.run(`${base}/md-draft`, {
      body: {
        contentMd: draftMd,
        ...(branchId ? { suggestedBranchId: branchId } : {}),
        ...(draftVersion !== null ? { expectedVersion: draftVersion } : {}),
      },
      ok: T.draftSaved,
    });
    // ponytail: the server sets the new version to expectedVersion + 1 (and 1
    // on first save), so counting locally beats reading the response back. If
    // it ever drifts, the next save 409s rather than overwriting anything.
    if (saved) setDraftVersion((v) => (v ?? 0) + 1);
  }

  // A fragment, not a wrapper <div>: `.with-side > *` already stacks its
  // children with the standard gap, and every block in this app gets its
  // spacing from a parent's gap rather than its own margin. One extra element
  // in between swallowed that gap, which is why the "Lưu" button sat flush
  // against the "Bản thảo" heading below it.
  return (
    <>
      {frozenBecause && <p className="notice">{frozenBecause}</p>}

      <h2>{T.correctedText}</h2>
      <p className="muted">{T.correctedTextHint}</p>
      <div className="field wide">
        <label htmlFor="corrected">{T.correctedText}</label>
        <textarea
          id="corrected"
          className="editor"
          value={corrected}
          onChange={(e) => setCorrected(e.target.value)}
          disabled={!active}
        />
      </div>
      <button
        disabled={m.busy || !active || !corrected.trim()}
        onClick={() =>
          void m.run(`${base}/corrected-text`, {
            body: { content: corrected },
            ok: T.correctedTextSaved,
          })
        }
      >
        {m.busy ? T.loading : T.save}
      </button>
      {/* Beside the button that caused it. There is one <Say> at the top of
          this screen and two full-height editors between it and these buttons,
          so "Đã lưu" was arriving a screenful above the press that earned it —
          reported as nothing happening. */}
      <SayMutation m={m} />

      <h2>{T.markdownDraft}</h2>
      <div className="field wide">
        <label htmlFor="draft">{T.contentMd}</label>
        <textarea
          id="draft"
          className="editor"
          value={draftMd}
          onChange={(e) => setDraftMd(e.target.value)}
          disabled={!active}
        />
      </div>
      <div className="field">
        <label htmlFor="suggested-branch">{T.suggestedBranch}</label>
        <select
          id="suggested-branch"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          disabled={!active}
        >
          <option value="">{T.chooseBranchNotYet}</option>
          {props.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      {/* ponytail: one busy flag for the screen, so every button on it shows
          the pending label rather than only the one that was pressed. */}
      <div className="button-row">
        <button disabled={m.busy || !active || !draftMd.trim()} onClick={() => void saveDraft()}>
          {m.busy ? T.loading : T.saveDraft}
        </button>
        <button
          className="secondary"
          disabled={m.busy || !active || !draftMd.trim()}
          onClick={() =>
            void m.run(`${base}/mark-ready-for-review`, {
              ok: T.sentForReview,
            })
          }
        >
          {m.busy ? T.loading : T.markReady}
        </button>
      </div>
      <SayMutation m={m} />
    </>
  );
}
