"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

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
