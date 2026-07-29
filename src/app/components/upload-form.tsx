"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { Say } from "./say";

/**
 * Upload with a real progress bar.
 *
 * `fetch()` cannot report upload progress, and the limit here is 100 MB: on a
 * phone connection a button reading "Đang tải…" sits unchanged for minutes and
 * reads as a frozen app, so people retry and upload twice. XMLHttpRequest is
 * the only browser API that emits `upload.onprogress`, which is why these
 * requests do not use fetch.
 */

export type UploadProgress = { index: number; total: number; name: string; percent: number | null };

/**
 * The one uploader: files go up SEQUENTIALLY, one XHR at a time — the server
 * and object store are happier, and "2/5: report.pdf" is progress a person can
 * read. Both the intake form and the library dropzone run through here.
 *
 * A failed file does not stop the queue; its name is collected and reported at
 * the end. Abort cancels the current file and stops the queue.
 * ponytail: no retry button; re-picking the failed files is the retry.
 */
export function useSequentialUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const stopRef = useRef(false);

  function uploadOne(
    form: FormData,
  ): Promise<
    | { status: "ok"; id: string }
    | { status: "failed"; reason: string | null }
    | { status: "aborted" }
  > {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", "/api/source/upload");
      xhr.upload.onprogress = (e) => {
        // lengthComputable is false for chunked bodies; leave the bar
        // indeterminate rather than inventing a number.
        if (e.lengthComputable)
          setProgress((p) => (p ? { ...p, percent: Math.round((e.loaded / e.total) * 100) } : p));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ status: "ok", id: (JSON.parse(xhr.responseText) as { id: string }).id });
        } else {
          // The server says WHY in Vietnamese — "Tệp vượt quá giới hạn 100 MB",
          // "Định dạng tệp này không được chấp nhận". That answer used to be
          // thrown away here and replaced with a bare "Không gửi được: <tên>",
          // which tells the reader to try again at the one thing that cannot
          // work twice.
          const body = (() => {
            try {
              return JSON.parse(xhr.responseText) as { message?: string };
            } catch {
              return null;
            }
          })();
          resolve({ status: "failed", reason: body?.message ?? null });
        }
      };
      // A transport error has no body and no sentence of its own.
      xhr.onerror = () => resolve({ status: "failed", reason: null });
      xhr.onabort = () => resolve({ status: "aborted" });
      xhr.send(form);
    });
  }

  async function start(
    files: File[],
    spaceId: string,
    extras?: { title?: string; description?: string },
  ): Promise<{ ids: string[]; failed: UploadFailure[]; aborted: boolean }> {
    stopRef.current = false;
    const ids: string[] = [];
    const failed: UploadFailure[] = [];
    let aborted = false;
    for (let i = 0; i < files.length; i++) {
      if (stopRef.current) {
        aborted = true;
        break;
      }
      const file = files[i];
      setProgress({ index: i + 1, total: files.length, name: file.name, percent: null });
      const form = new FormData();
      form.set("spaceId", spaceId);
      form.set("file", file);
      // Typed metadata only describes one file; with several, titles default
      // from filenames server-side.
      // ponytail: per-file metadata editing is not built; rename after upload covers it.
      if (files.length === 1) {
        if (extras?.title) form.set("title", extras.title);
        if (extras?.description) form.set("description", extras.description);
      }
      const result = await uploadOne(form);
      if (result.status === "ok") ids.push(result.id);
      else if (result.status === "failed") failed.push({ name: file.name, reason: result.reason });
      else {
        aborted = true;
        break;
      }
    }
    setProgress(null);
    return { ids, failed, aborted };
  }

  function abort() {
    stopRef.current = true;
    xhrRef.current?.abort();
  }

  return { busy: progress !== null, progress, start, abort };
}

/** The per-file progress line, shared by the form and the dropzone strip. */
export function UploadProgressLine({ progress }: { progress: UploadProgress }) {
  return (
    <div className="upload-progress">
      {/* <progress> with no value renders the platform's indeterminate bar,
          which is exactly right while lengthComputable is false.
          The name says which file: the sentence beside the bar is a sibling,
          so without this the bar announces as an unnamed progress indicator
          during an upload of six things. */}
      <progress
        aria-label={`${T.uploadSendingPrefix} ${progress.index}/${progress.total}: ${progress.name}`}
        {...(progress.percent === null ? {} : { value: progress.percent, max: 100 })}
      />
      <span className="muted">
        {`${T.uploadSendingPrefix} ${progress.index}/${progress.total}: ${progress.name}`}
        {progress.percent === null
          ? ""
          : progress.percent < 100
            ? ` — ${progress.percent}%`
            : ` — ${T.uploadFinishing}`}
      </span>
    </div>
  );
}

/** One file that did not go, and the server's reason if it gave one. */
export type UploadFailure = { name: string; reason: string | null };

/**
 * What to tell the reader. A file refused for a reason they can act on ("quá
 * giới hạn 100 MB") gets that reason printed beside its name; only the ones
 * that failed silently get the generic "choose them again" hint, because that
 * hint is wrong advice for a file that will be refused every time.
 */
export function failedList(failed: UploadFailure[], retryHint: string): string {
  const lines = failed.map((f) => (f.reason ? `${f.name} — ${f.reason}` : f.name));
  const anyUnexplained = failed.some((f) => !f.reason);
  return `${T.uploadFailedPrefix} ${lines.join("; ")}.${anyUnexplained ? ` ${retryHint}` : ""}`;
}

export function UploadForm({ spaces }: { spaces: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const { busy, progress, start, abort } = useSequentialUpload();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const many = fileNames.length > 1;
  const disabled = busy || leaving;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const files = (data.getAll("file") as File[]).filter((f) => f.name);
    const spaceId = String(data.get("spaceId") ?? "");
    // The file input cannot carry `required`: it is visually hidden behind its
    // label, and the browser refuses to report a validity bubble on a control
    // it cannot bring into view — the submit was simply swallowed, with nothing
    // said and nothing to read. The rule is stated here instead, in the app's
    // own words, in the place every other answer on this form appears.
    if (files.length === 0) {
      setError(T.uploadNoFileChosen);
      return;
    }
    const { ids, failed, aborted } = await start(files, spaceId, {
      title: String(data.get("title") ?? "").trim() || undefined,
      description: String(data.get("description") ?? "").trim() || undefined,
    });
    if (ids.length > 0) router.refresh();
    if (aborted) return;
    if (failed.length > 0) {
      setError(failedList(failed, T.uploadRetryChooseHint));
      return;
    }
    // Stay disabled through the navigation: re-enabling here would let an
    // impatient second click upload the same files twice.
    setLeaving(true);
    router.push(ids.length === 1 ? `/library/${ids[0]}` : "/library");
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
      <Say error={error} />
      {/* The browser writes its own words into a file input — "Browse… / No
          file selected", English, in a Vietnamese screen. So the real input is
          hidden and its <label> is the visible trigger; the names of the chosen
          files are printed here instead of by the control.
          ponytail: no .field wrapper on this one — `.field label` would repaint
          the trigger muted-on-canopy, and .file-field already lays out the row. */}
      <div className="file-field">
        <input
          id="file"
          name="file"
          type="file"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))}
        />
        <label htmlFor="file" className="button secondary">
          Chọn {T.file.toLowerCase()}
        </label>
        <span className="muted">
          {fileNames.length === 0 ? T.noFileChosen : fileNames.join(", ")}
        </span>
      </div>
      <div className="field">
        <label htmlFor="spaceId">{T.space}</label>
        <select
          id="spaceId"
          name="spaceId"
          required
          defaultValue={spaces.length === 1 ? spaces[0].id : ""}
          disabled={disabled}
        >
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
      {/* With several files there is nothing one title could honestly name, so
          the fields are not rendered at all; each file is titled by its name. */}
      {!many && (
        <>
          <div className="field">
            <label htmlFor="title">
              {T.title} {T.optionalSuffix}
            </label>
            <input id="title" name="title" type="text" disabled={disabled} />
          </div>
          <div className="field">
            <label htmlFor="description">{T.description} (không bắt buộc)</label>
            <textarea id="description" name="description" rows={3} disabled={disabled} />
          </div>
        </>
      )}

      {progress && <UploadProgressLine progress={progress} />}

      <div className="button-row">
        {busy && (
          <button type="button" className="secondary" onClick={abort}>
            {T.cancel}
          </button>
        )}
        {/* Two panels on this screen, two buttons both reading "Gửi" — a control
            has to say what it sends. T.uploadCta is already that sentence. */}
        <button type="submit" disabled={disabled}>
          {disabled ? T.loading : T.uploadCta}
        </button>
      </div>
    </form>
  );
}
