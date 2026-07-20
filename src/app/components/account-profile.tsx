"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation, Say } from "@/app/components/say";

// The member's own record (`/account` § Hồ sơ): display name, Zalo id and the
// picture. One save button covers all three — if a file is chosen it is
// uploaded first, then the PATCH; useMutation's refresh repaints the server
// page (and the rail) with the new name and picture.

export function AccountProfile({
  initial,
}: {
  initial: { displayName: string; zaloUserId: string | null };
}) {
  const m = useMutation();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [zaloUserId, setZaloUserId] = useState(initial.zaloUserId ?? "");
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
        const err = (await res.json().catch(() => null)) as { message?: string } | null;
        setUploadError(err?.message ?? T.genericError);
        return; // the name PATCH can wait until the picture problem is fixed
      }
      setFile(null);
    }
    await m.run("/api/account", {
      method: "PATCH",
      body: { displayName, zaloUserId: zaloUserId.trim() || null },
      // TODO(vi): move to src/lib/vi.ts
      ok: "Đã lưu hồ sơ.",
    });
  }

  const busy = m.busy || uploading;

  return (
    <>
      <div className="field">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <label htmlFor="acc-name">Tên hiển thị</label>
        <input
          id="acc-name"
          type="text"
          value={displayName}
          required
          disabled={busy}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="field">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <label htmlFor="acc-zalo">Zalo ID</label>
        <input
          id="acc-zalo"
          type="text"
          value={zaloUserId}
          disabled={busy}
          onChange={(e) => setZaloUserId(e.target.value)}
        />
        {/* TODO(vi): move to src/lib/vi.ts */}
        <span className="muted">Dùng để nhận thông báo qua Zalo, nếu bạn bật kênh này.</span>
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
          {/* TODO(vi): move to src/lib/vi.ts */}
          Chọn ảnh đại diện
        </label>
        {/* TODO(vi): move to src/lib/vi.ts */}
        <span className="muted">{file ? file.name : "PNG, JPEG hoặc WebP, tối đa 2 MB."}</span>
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
