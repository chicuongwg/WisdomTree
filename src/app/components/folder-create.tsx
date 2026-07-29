"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

/**
 * "Thư mục mới" — a small inline form, not a prompt(): the name field appears
 * in place, the server's duplicate-name 409 is shown in words, and Enter
 * saves. Creates in the folder currently open (parentId null = the root).
 */
export function FolderCreate({ spaceId, parentId }: { spaceId: string; parentId: string | null }) {
  const m = useMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button type="button" className="secondary" onClick={() => setOpen(true)}>
        {T.newFolder}
      </button>
    );
  }

  return (
    <form
      className="inline"
      onSubmit={(e) => {
        e.preventDefault();
        void m.run(`/api/spaces/${spaceId}/folders`, { body: { name, parentId } }).then((ok) => {
          if (ok) {
            setOpen(false);
            setName("");
          }
        });
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={T.folderName}
        aria-label={T.folderName}
        autoFocus
        disabled={m.busy}
      />
      <button type="submit" disabled={m.busy || !name.trim()}>
        {m.busy ? T.loading : T.save}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setOpen(false);
          m.reset();
        }}
        disabled={m.busy}
      >
        {T.cancel}
      </button>
      <SayMutation m={m} />
    </form>
  );
}
