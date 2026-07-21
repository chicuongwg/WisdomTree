"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { Say } from "./say";
import { failedList, UploadProgressLine, useSequentialUpload } from "./upload-form";

/**
 * Drag-and-drop intake on the library. Enhancement only: the normal
 * "Gửi tư liệu" form is the accessible path, so the veil is aria-hidden and
 * nothing here traps the keyboard. The wrapper is `display: contents`
 * (.dropzone-wrap) so main.page's `>` child rules keep matching the server
 * markup; the veil and progress strip are position: fixed and need no box.
 *
 * Where a drop lands: the page's spaceId filter if set, else the only space
 * the reader belongs to, else a small native <dialog> asks — same element and
 * paper as confirm-button.tsx, minus the ceremony.
 */
export function LibraryDropzone({
  spaces,
  spaceId,
  children,
}: {
  spaces: Array<{ id: string; name: string }>;
  spaceId?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { busy, progress, start, abort } = useSequentialUpload();
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  const [pending, setPending] = useState<File[] | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const target = spaceId ?? (spaces.length === 1 ? spaces[0].id : undefined);
  const targetName = target ? spaces.find((s) => s.id === target)?.name : undefined;

  async function run(files: File[], to: string) {
    setError(null);
    const { ids, failed } = await start(files, to);
    if (failed.length > 0) setError(failedList(failed, T.uploadRetryDropHint));
    if (ids.length > 0) router.refresh();
  }

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  function onDrop(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDepth(0);
    if (busy) return; // one queue at a time; the strip already says so
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (target) {
      void run(files, target);
    } else {
      // Several spaces and no filter: hold the files and ask.
      setPending(files);
      dialogRef.current?.showModal();
    }
  }

  return (
    <div
      className="dropzone-wrap"
      onDragEnter={(e) => hasFiles(e) && setDepth((d) => d + 1)}
      onDragLeave={(e) => hasFiles(e) && setDepth((d) => Math.max(0, d - 1))}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      onDrop={onDrop}
    >
      {children}

      {depth > 0 && (
        // aria-hidden: it duplicates the visible upload flow for a pointer
        // that is mid-drag; there is nothing here for assistive tech.
        <div className="dropzone-veil" aria-hidden="true">
          <div className="panel">
            <p>{T.dropVeilPrompt}</p>
            {targetName && (
              <p className="muted">
                {T.space}: {targetName}
              </p>
            )}
          </div>
        </div>
      )}

      {(busy || error) && (
        <div className="dropzone-progress panel">
          {progress && <UploadProgressLine progress={progress} />}
          {busy ? (
            <button type="button" className="secondary" onClick={abort}>
              {T.cancel}
            </button>
          ) : (
            <>
              <Say error={error} />
              <button type="button" className="secondary" onClick={() => setError(null)}>
                {T.close}
              </button>
            </>
          )}
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="confirm"
        onClose={(e) => {
          const files = pending;
          setPending(null);
          if (e.currentTarget.returnValue !== "confirm" || !files) return;
          const to = selectRef.current?.value;
          if (to) void run(files, to);
        }}
      >
        <form method="dialog">
          <h2>{T.dropSpaceQuestion}</h2>
          <div className="field">
            <label htmlFor="dropzone-space">{T.space}</label>
            <select id="dropzone-space" ref={selectRef} defaultValue={spaces[0]?.id}>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="button-row confirm-actions">
            <button type="submit" value="cancel" className="secondary">
              {T.cancel}
            </button>
            <button type="submit" value="confirm">
              {T.uploadCta}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
