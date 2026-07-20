"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

/**
 * Upload with a real progress bar.
 *
 * `fetch()` cannot report upload progress, and the limit here is 100 MB: on a
 * phone connection a button reading "Đang tải…" sits unchanged for minutes and
 * reads as a frozen app, so people retry and upload twice. XMLHttpRequest is
 * the only browser API that emits `upload.onprogress`, which is why this one
 * request does not use fetch.
 */
export function UploadForm({ spaces }: { spaces: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPercent(0);

    const form = new FormData(event.currentTarget);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/source/upload");

    xhr.upload.onprogress = (e) => {
      // lengthComputable is false for chunked bodies; leave the bar
      // indeterminate rather than inventing a number.
      if (e.lengthComputable) setPercent(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const source = JSON.parse(xhr.responseText) as { id: string };
        // Stay busy through the navigation: re-enabling here would let an
        // impatient second click upload the same file twice.
        router.push(`/library/${source.id}`);
        router.refresh();
        return;
      }
      let message: string = T.genericError;
      try {
        message = (JSON.parse(xhr.responseText) as { message?: string }).message ?? message;
      } catch {
        // Non-JSON body (a proxy's 413 page, say) — keep the generic message.
      }
      setError(message);
      setBusy(false);
      setPercent(null);
    };

    xhr.onerror = () => {
      setError(T.uploadNetworkError);
      setBusy(false);
      setPercent(null);
    };

    xhr.onabort = () => {
      setBusy(false);
      setPercent(null);
    };

    xhr.send(form);
  }

  if (spaces.length === 0) {
    // Without a space there is nowhere for the file to go, and an empty select
    // with a disabled placeholder explains nothing.
    return (
      <div className="empty-state">
        <p>{T.noSpacesTitle}</p>
        <p className="muted">{T.noSpacesHint}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="error-text">{error}</p>}
      {/* The browser writes its own words into a file input — "Browse… / No
          file selected", English, in a Vietnamese screen. So the real input is
          hidden and its <label> is the visible trigger; the name of the chosen
          file is printed here instead of by the control.
          ponytail: no .field wrapper on this one — `.field label` would repaint
          the trigger muted-on-canopy, and .file-field already lays out the row. */}
      <div className="file-field">
        <input id="file" name="file" type="file" required disabled={busy} className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        <label htmlFor="file" className="button secondary">
          Chọn {T.file.toLowerCase()}
        </label>
        {/* TODO(vi): move to src/lib/vi.ts */}
        <span className="muted">{fileName ?? "Chưa chọn tệp"}</span>
      </div>
      <div className="field">
        <label htmlFor="spaceId">{T.space}</label>
        <select id="spaceId" name="spaceId" required defaultValue="" disabled={busy}>
          <option value="" disabled>
            — chọn {T.space.toLowerCase()} —
          </option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="title">{T.title}</label>
        <input id="title" name="title" type="text" required disabled={busy} />
      </div>
      <div className="field">
        <label htmlFor="description">{T.description}</label>
        <textarea id="description" name="description" rows={3} disabled={busy} />
      </div>

      {busy && (
        <div className="upload-progress">
          {/* <progress> with no value renders the platform's indeterminate bar,
              which is exactly right while lengthComputable is false. */}
          <progress {...(percent === null ? {} : { value: percent, max: 100 })} />
          <span className="muted">
            {percent === null
              ? T.uploading
              : percent < 100
                ? `${T.uploading} ${percent}%`
                : T.uploadFinishing}
          </span>
        </div>
      )}

      <div className="button-row">
        {busy && (
          <button type="button" className="secondary" onClick={() => xhrRef.current?.abort()}>
            {T.cancel}
          </button>
        )}
        {/* Two panels on this screen, two buttons both reading "Gửi" — a control
            has to say what it sends. T.uploadCta is already that sentence. */}
        <button type="submit" disabled={busy}>
          {busy ? T.loading : T.uploadCta}
        </button>
      </div>
    </form>
  );
}
