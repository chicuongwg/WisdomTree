"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Say, SayMutation } from "./say";
import { ConfirmButton } from "./confirm-button";

/**
 * Librarian-only: correct how many books sit under one item code.
 *
 * The refusal a librarian meets most is lowering the count while copies are
 * still out, so the server's message is what this shows — it names how many
 * are unreturned, which the browser's own `min` validation cannot know.
 */
export function CatalogCopiesForm({ itemId, copies }: { itemId: string; copies: number }) {
  const m = useMutation();
  const [value, setValue] = useState(String(copies));

  return (
    <form
      className="inline"
      onSubmit={(event) => {
        event.preventDefault();
        void m.run(`/api/catalog/${itemId}`, {
          method: "PATCH",
          body: { copies: value },
          ok: T.copiesSaved,
        });
      }}
    >
      <SayMutation m={m} />
      <label htmlFor="cc-copies">{T.copiesTotal}</label>
      <input
        id="cc-copies"
        type="number"
        min={1}
        step={1}
        className="copies-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" disabled={m.busy || value === ""}>
        {m.busy ? T.loading : T.updateCopies}
      </button>
    </form>
  );
}

/**
 * Retire a title the library no longer holds, or one entered by mistake.
 *
 * It lives beside the copies form because both are the librarian's corrections
 * to the same record, and neither is a thing a borrower does. The confirmation
 * says what happens — off the list, still on record — rather than asking
 * whether the librarian is sure.
 */
export function CatalogArchiveButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    setError(null);
    const res = await fetch(`/api/catalog/${itemId}/archive`, { method: "POST" });
    if (!res.ok) {
      // The refusal that matters is "a copy is still out", and only the server
      // knows how many — so its sentence is the one shown.
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? T.genericError);
      return;
    }
    router.push("/catalog");
    router.refresh();
  }

  return (
    <>
      <ConfirmButton
        label={T.archiveCatalogItem}
        title={T.confirmArchiveItemTitle}
        body={T.confirmArchiveItemBody}
        className="secondary"
        onConfirm={archive}
      />
      <Say error={error} />
    </>
  );
}
