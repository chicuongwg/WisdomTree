"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Say } from "./say";

/** Library admin: add a physical book. The only way the shelf grows. */
export function CatalogItemForm({ spaces }: { spaces: Array<{ id: string; name: string }> }) {
  const m = useMutation();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [location, setLocation] = useState("");
  // A string, not a number: a half-typed box is empty, and an empty box must
  // not read as 0. The service parses it and refuses anything below 1.
  const [copies, setCopies] = useState("1");
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "");
  const [added, setAdded] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdded(null);
    const item = await m.runJson<{ itemCode: string }>("/api/library/items", {
      body: { title, author, location, copies, spaceId },
    });
    if (!item) return;
    setTitle("");
    setAuthor("");
    setLocation("");
    setCopies("1");
    // The item code is generated server-side, so showing it back is the only
    // way the librarian learns what to write on the spine.
    setAdded(item.itemCode);
  }

  if (spaces.length === 0) return null;

  return (
    <form onSubmit={submit}>
      <Say error={m.error} ok={added && `${T.catalogItemAdded} ${added}`} />
      <div className="field">
        <label htmlFor="ci-title">{T.catalogItem}</label>
        <input
          id="ci-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="ci-author">{T.author}</label>
        <input
          id="ci-author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="ci-location">{T.shelfLocation}</label>
        <input
          id="ci-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Kệ A-3"
        />
      </div>
      <div className="field">
        <label htmlFor="ci-copies">{T.copiesLabel}</label>
        {/* One item code, several books on the shelf: the library owns three
            copies of Truyện Kiều, not three catalogue entries. */}
        <input
          id="ci-copies"
          type="number"
          min={1}
          step={1}
          className="copies-input"
          value={copies}
          onChange={(e) => setCopies(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="ci-space">{T.space}</label>
        <select id="ci-space" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} required>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={m.busy || !title.trim()}>
        {m.busy ? T.loading : T.addCatalogItem}
      </button>
    </form>
  );
}
