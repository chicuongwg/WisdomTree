"use client";

import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";
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
  const m = useMutation();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await m.runJson<{ id: string }>(
      branch ? `/api/tree/branches/${branch.id}` : "/api/tree/branches",
      {
        method: branch ? "PATCH" : "POST",
        body: {
          name: String(form.get("name") ?? ""),
          description: String(form.get("description") ?? ""),
          ...(branch ? { expectedVersion: branch.version } : {}),
        },
      },
    );
    if (!saved) return;
    router.push(`/tree/branch/${saved.id}`);
  }

  return (
    <form onSubmit={onSubmit}>
      <SayMutation m={m} />
      <div className="field">
        <label htmlFor="name">{T.branchName}</label>
        <input id="name" name="name" type="text" required defaultValue={branch?.name ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="description">{T.description}</label>
        <textarea id="description" name="description" rows={3} defaultValue={branch?.description ?? ""} />
      </div>
      <button type="submit" disabled={m.busy}>
        {m.busy ? T.loading : T.save}
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
  const m = useMutation();

  async function archive() {
    if (await m.run(`/api/tree/branches/${branchId}/archive`)) router.push("/tree/branches");
  }

  return (
    <>
      <ConfirmButton
        label={T.archiveBranch}
        title={T.confirmArchiveBranchTitle}
        body={T.confirmArchiveBranchBody}
        className="secondary"
        disabled={m.busy}
        onConfirm={archive}
      />
      <SayMutation m={m} />
    </>
  );
}
