"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
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
    let res: Response | null = null;
    try {
      res = await fetch(`/api/source/${sourceId}/version`, { method: "POST", body: form });
    } catch {
      res = null;
    }
    if (!res?.ok) {
      const payload = res ? ((await res.json().catch(() => null)) as { message?: string } | null) : null;
      setUploadError(payload?.message ?? T.genericError);
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
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Khôi phục</h2>
        <Say error={m.error} ok={m.ok} />
        <ConfirmButton
          disabled={m.busy}
          // TODO(vi): move to src/lib/vi.ts
          label="Khôi phục tư liệu"
          title="Khôi phục tư liệu này?"
          body="Tư liệu sẽ trở lại thư viện và tải xuống được như trước khi thu hồi."
          onConfirm={() => void m.run(`/api/source/${sourceId}/restore`)}
        />
      </div>
    );
  }

  if (!canEdit) return null;
  const busy = m.busy || uploading;

  return (
    <div className="panel">
      {/* TODO(vi): move to src/lib/vi.ts */}
      <h2>Tệp và thư mục</h2>
      <Say error={m.error ?? uploadError} ok={m.ok} />
      <div className="field">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <label htmlFor="move-folder">Chuyển thư mục</label>
        <div className="inline">
          <select id="move-folder" value={target} onChange={(e) => setTarget(e.target.value)} disabled={busy}>
            {/* TODO(vi): move to src/lib/vi.ts */}
            <option value="">— Gốc kho —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || target === (folderId ?? "")}
            onClick={() => void m.run(`/api/source/${sourceId}/move`, { body: { folderId: target || null } })}
          >
            {/* TODO(vi): move to src/lib/vi.ts */}
            {m.busy ? T.loading : "Chuyển"}
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
          {/* TODO(vi): move to src/lib/vi.ts */}
          {uploading ? T.loading : "Tải bản mới"}
        </label>
        <span className="muted">{fileName || "Bản mới thay thế bản hiện tại; các bản cũ vẫn được giữ."}</span>
      </div>
    </div>
  );
}
