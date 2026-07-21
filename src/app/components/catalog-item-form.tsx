"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { Say } from "./say";

/** Librarian Desk: add a physical item. The only way the catalogue grows. */
export function CatalogItemForm({ spaces }: { spaces: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [location, setLocation] = useState("");
  // A string, not a number: a half-typed box is empty, and an empty box must
  // not read as 0. The service parses it and refuses anything below 1.
  const [copies, setCopies] = useState("1");
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setAdded(null);
    const res = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, author, location, copies, spaceId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? T.genericError);
      setBusy(false);
      return;
    }
    const item = (await res.json()) as { itemCode: string };
    setTitle("");
    setAuthor("");
    setLocation("");
    setCopies("1");
    // The item code is generated server-side, so showing it back is the only
    // way the librarian learns what to write on the spine.
    setAdded(item.itemCode);
    router.refresh();
    setBusy(false);
  }

  if (spaces.length === 0) return null;

  return (
    <form onSubmit={submit}>
      <Say error={error} ok={added && `${T.catalogItemAdded} ${added}`} />
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
        <input id="ci-author" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
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
      <button type="submit" disabled={busy || !title.trim()}>
        {busy ? T.loading : T.addCatalogItem}
      </button>
    </form>
  );
}
