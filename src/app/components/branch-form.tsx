"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { Say } from "./say";
import { ConfirmButton } from "./confirm-button";

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
      setError(body?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    const saved = (await res.json()) as { id: string };
    router.push(`/tree/branch/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <Say error={error} />
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

/**
 * "Chuyên đề này đã xong" — the branch leaves the list of live subjects.
 *
 * It lives beside the branch form because it is the same screen's editing
 * kit, and the confirmation says what actually changes rather than asking
 * whether the reader is sure.
 *
 * Once archived the hub itself answers 404 (every branch read skips an
 * archived branch), so staying here would leave the reader on a page that
 * breaks on the next refresh. We send them to the list of subjects, which is
 * where the change is visible: the branch they just finished is no longer in
 * it.
 */
export function BranchArchiveButton({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    setError(null);
    const res = await fetch(`/api/tree/branches/${branchId}/archive`, { method: "POST" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? T.genericError);
      return;
    }
    router.push("/tree/branches");
    router.refresh();
  }

  return (
    <>
      <ConfirmButton
        label={T.archiveBranch}
        title={T.confirmArchiveBranchTitle}
        body={T.confirmArchiveBranchBody}
        className="secondary"
        onConfirm={archive}
      />
      <Say error={error} />
    </>
  );
}
