"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, translateApiError } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { ConfirmButton } from "./confirm-button";
import { Say } from "./say";

/**
 * What can be done about the file itself, as opposed to its label
 * (source-owner-actions handles that): file it in a folder, hand in a
 * corrected copy, or — Admin/Op, once withdrawn — bring it back.
 * The page decides who sees which control; the server enforces it regardless.
 */
export function SourceFileActions({
  sourceId,
  folderId,
  folders,
  archived,
  canEdit,
  canRestore,
}: {
  sourceId: string;
  folderId: string | null;
  folders: Array<{ id: string; name: string }>;
  archived: boolean;
  /** Owner or Admin/Op: move + new version. */
  canEdit: boolean;
  /** Admin/Op and the item is withdrawn: restore. */
  canRestore: boolean;
}) {
  const router = useRouter();
  const m = useMutation();
  const [target, setTarget] = useState(folderId ?? "");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadVersion(file: File) {
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    let res: Response | null;
    try {
      res = await fetch(`/api/source/${sourceId}/version`, { method: "POST", body: form });
    } catch {
      res = null;
    }
    if (!res?.ok) {
      const payload = res
        ? ((await res.json().catch(() => null)) as {
          message?: string;
          code?: string;
          details?: Record<string, unknown>;
        } | null)
        : null;
      setUploadError(payload ? translateApiError(payload.code, payload.details, payload.message) : T.genericError);
      setUploading(false);
      return;
    }
    setFileName("");
    router.refresh();
    setUploading(false);
  }

  if (archived) {
    if (!canRestore) return null;
    return (
      <div className="panel">
        <h2>{T.restoreHeading}</h2>
        <Say error={m.error} ok={m.ok} />
        <ConfirmButton
          disabled={m.busy}
          label={T.restoreSource}
          title={T.confirmRestoreSourceTitle}
          body={T.confirmRestoreSourceBody}
          onConfirm={() => void m.run(`/api/source/${sourceId}/restore`)}
        />
      </div>
    );
  }

  if (!canEdit) return null;
  const busy = m.busy || uploading;

  return (
    <div className="panel">
      <h2>{T.fileAndFolderHeading}</h2>
      <Say error={m.error ?? uploadError} ok={m.ok} />
      <div className="field">
        <label htmlFor="move-folder">{T.moveFolder}</label>
        <div className="button-row">
          <select
            id="move-folder"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={busy}
          >
            <option value="">{T.folderRootOption}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || target === (folderId ?? "")}
            onClick={() =>
              void m.run(`/api/source/${sourceId}/move`, { body: { folderId: target || null } })
            }
          >
            {m.busy ? T.loading : T.moveAction}
          </button>
        </div>
      </div>
      {/* Same hidden-input trigger as the upload form: the browser's own
          file-control words are English in a Vietnamese screen. Choosing a
          file uploads it — a corrected copy needs no second confirm. */}
      <div className="file-field">
        <input
          id="new-version-file"
          type="file"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setFileName(file.name);
              void uploadVersion(file);
            }
          }}
        />
        <label htmlFor="new-version-file" className="button secondary">
          {uploading ? T.loading : T.uploadNewVersion}
        </label>
        <span className="muted">
          {fileName || "Bản mới thay thế bản hiện tại; các bản cũ vẫn được giữ."}
        </span>
      </div>
    </div>
  );
}
