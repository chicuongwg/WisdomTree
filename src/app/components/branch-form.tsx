"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

/**
 * Create Branch (`/tree/branch/new`) and Branch Hub metadata edit share this
 * form; edit mode PATCHes with the optimistic-lock expectedVersion.
 */
export function BranchForm({
  branch,
}: {
  branch?: { id: string; name: string; description: string | null; version: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      ...(branch ? { expectedVersion: branch.version } : {}),
    };
    const res = await fetch(branch ? `/api/tree/branches/${branch.id}` : "/api/tree/branches", {
      method: branch ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
      setBusy(false);
      return;
    }
    const saved = (await res.json()) as { id: string };
    router.push(`/tree/branch/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="error-text">{error}</p>}
      <div className="field">
        <label htmlFor="name">{T.branchName}</label>
        <input id="name" name="name" type="text" required defaultValue={branch?.name ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="description">{T.description}</label>
        <textarea id="description" name="description" rows={3} defaultValue={branch?.description ?? ""} />
      </div>
      <button type="submit" disabled={busy}>
        {busy ? T.loading : T.save}
      </button>
    </form>
  );
}
