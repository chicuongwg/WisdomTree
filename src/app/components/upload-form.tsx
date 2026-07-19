"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

export function UploadForm({ spaces }: { spaces: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/source/upload", { method: "POST", body: form });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    const source = (await res.json()) as { id: string };
    router.push(`/library/${source.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="error-text">{error}</p>}
      <div className="field">
        <label htmlFor="file">{T.file}</label>
        <input id="file" name="file" type="file" required />
      </div>
      <div className="field">
        <label htmlFor="spaceId">{T.space}</label>
        <select id="spaceId" name="spaceId" required defaultValue="">
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
        <input id="title" name="title" type="text" required />
      </div>
      <div className="field">
        <label htmlFor="description">{T.description}</label>
        <textarea id="description" name="description" rows={3} />
      </div>
      <button type="submit" disabled={busy}>
        {busy ? T.loading : T.submit}
      </button>
    </form>
  );
}
