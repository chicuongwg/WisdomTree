"use client";

import { useState } from "react";
import { T, translateApiError } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation, Say } from "@/app/components/say";

// The member's own record (`/account` § Hồ sơ): display name and the
// picture. One save button covers both — if a file is chosen it is
// uploaded first, then the PATCH; useMutation's refresh repaints the server
// page (and the rail) with the new name and picture.

export function AccountProfile({
  initial,
}: {
  initial: { displayName: string };
}) {
  const m = useMutation();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function save() {
    setUploadError(null);
    if (file) {
      setUploading(true);
      const body = new FormData();
      body.append("file", file);
      let res: Response;
      try {
        res = await fetch("/api/account/avatar", { method: "POST", body });
      } catch {
        setUploadError(T.genericError);
        setUploading(false);
        return;
      }
      setUploading(false);
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          message?: string;
          code?: string;
          details?: Record<string, unknown>;
        } | null;
        setUploadError(err ? translateApiError(err.code, err.details, err.message) : T.genericError);
        return; // the name PATCH can wait until the picture problem is fixed
      }
      setFile(null);
    }
    await m.run("/api/account", {
      method: "PATCH",
      body: { displayName },
      ok: T.profileSaved,
    });
  }

  const busy = m.busy || uploading;

  return (
    <>
      <div className="field">
        <label htmlFor="acc-name">{T.displayNameLabel}</label>
        <input
          id="acc-name"
          type="text"
          value={displayName}
          required
          disabled={busy}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      {/* Same hidden-input trigger as the upload form: the browser's own
          file-control words are English in a Vietnamese screen. */}
      <div className="file-field">
        <input
          id="acc-avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <label htmlFor="acc-avatar" className="button secondary">
          {T.chooseAvatar}
        </label>
        <span className="muted">{file ? file.name : T.avatarConstraint}</span>
      </div>
      <SayMutation m={m} />
      <Say error={uploadError} />
      <div className="button-row">
        <button onClick={() => void save()} disabled={busy || !displayName.trim()}>
          {busy ? T.loading : T.save}
        </button>
      </div>
    </>
  );
}
