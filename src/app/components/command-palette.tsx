"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { T, verificationStateLabel } from "@/lib/vi";
import { cardPosition, loadPreview, NodePreviewCard, type NodePreview } from "./node-link";

// Command palette (VS Code / Obsidian, Ctrl+K): full-text search over tree
// nodes via GET /api/tree/search, plus quick-open entries for every screen
// the current role can reach. Opened by the shortcut, the sidebar searchbox
// or the rail's "more" button (all three send "wt:open-palette").
//
// The element is the platform's own <dialog> opened with showModal(), the same
// as ConfirmButton: focus trapping, Escape and the inert page behind come from
// the browser. It used to be a plain <div role="dialog">, which meant Tab
// walked straight out of it into a page that was still fully tabbable.
//
// The result list is a listbox driven by aria-activedescendant: focus stays in
// the input while the arrow keys move the selection, so what is highlighted is
// also what is announced.

type SearchHit = {
  id: string;
  title: string;
  branchName: string;
  verification: string;
};

type Entry = { key: string; label: string; hint: string; href: string };

export function CommandPalette({ role }: { role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseId = useId();
  const listId = `${baseId}list`;
  const rowId = (key: string) => `${baseId}${key}`;

  const screens: Entry[] = [
    { key: "tree", label: T.tree, hint: T.paletteHintGo, href: "/tree" },
    { key: "branches", label: T.navBranches, hint: T.paletteHintGo, href: "/tree/branches" },
    { key: "library", label: T.library, hint: T.paletteHintGo, href: "/library" },
    { key: "catalog", label: T.catalog, hint: T.paletteHintGo, href: "/catalog" },
    { key: "intake", label: T.sourceIntake, hint: T.paletteHintGo, href: "/source/intake" },
    { key: "mine", label: T.mySubmissions, hint: T.paletteHintGo, href: "/source/mine" },
    // These two say which space they belong to instead of the generic "đi
    // tới": the board and the deadline calendar are the pair readers mix up,
    // and the palette is often how they are reached.
    { key: "board", label: T.board, hint: T.navWork, href: "/board" },
    { key: "deadlines", label: T.deadline, hint: T.navProjects, href: "/deadlines" },
    { key: "notifications", label: T.notificationCenter, hint: T.paletteHintGo, href: "/notifications" },
    { key: "account", label: T.account, hint: T.paletteHintGo, href: "/account" },
  ];
  if (role === "editor" || role === "admin_op") {
    screens.push({
      key: "new-branch",
      label: T.createBranch,
      hint: T.paletteHintGo,
      href: "/tree/branch/new",
    });
  }
  if (role === "admin_op") {
    screens.push(
      { key: "review", label: T.reviewQueue, hint: T.paletteHintGo, href: "/review" },
      { key: "inbox", label: T.sourceInbox, hint: T.paletteHintGo, href: "/source/inbox" },
      { key: "desk", label: T.librarianDesk, hint: T.paletteHintGo, href: "/catalog/admin" },
      { key: "admin", label: T.adminConsole, hint: T.paletteHintGo, href: "/admin" },
      { key: "health", label: T.healthPageTitle, hint: T.paletteHintGo, href: "/admin/health" },
    );
  }

  const q = query.trim().toLowerCase();
  const screenMatches = q
    ? // The hint counts as searchable text, so typing "dự án" finds Hạn chót
      // even though the word is not in its name.
      screens.filter((s) => `${s.label} ${s.hint}`.toLowerCase().includes(q))
    : screens;
  const results: Entry[] = [
    ...hits.map((h) => ({
      key: `node:${h.id}`,
      label: h.title,
      hint: `${h.branchName} · ${verificationStateLabel(h.verification)}`,
      href: `/tree/node/${h.id}`,
    })),
    ...screenMatches,
  ];

  const close = () => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setSel(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wt:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wt:open-palette", onOpen);
    };
  }, []);

  // Escape, the focus trap and focusing the input on open are the dialog's
  // own doing; this only keeps the element in step with `open`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // debounced tree search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = query.trim();
    if (!term) {
      setHits([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tree/search?q=${encodeURIComponent(term)}`);
        setHits(res.ok ? ((await res.json()) as SearchHit[]).slice(0, 8) : []);
      } catch {
        setHits([]);
      } finally {
        setBusy(false);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  useEffect(() => setSel(0), [query, hits.length]);

  // Preview follows the selection, so the card is reachable by arrow keys and
  // not only by pointer (same card component as every other node link).
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const [peek, setPeek] = useState<{ top: number; left: number } | null>(null);
  const [preview, setPreview] = useState<NodePreview | null>(null);
  const selectedKey = results[sel]?.key;
  useEffect(() => {
    if (!open || !selectedKey?.startsWith("node:")) {
      setPeek(null);
      return;
    }
    const nodeId = selectedKey.slice(5);
    const row = rowRefs.current.get(selectedKey);
    if (row) setPeek(cardPosition(row));
    setPreview(null);
    let alive = true;
    void loadPreview(nodeId).then((p) => alive && setPreview(p));
    return () => {
      alive = false;
    };
  }, [open, selectedKey]);

  const go = (entry: Entry) => {
    close();
    router.push(entry.href);
  };

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label={T.quickSearch}
      onClose={close}
      onMouseDown={(e) => {
        // With no padding of its own the dialog box is fully covered by its
        // children, so hitting the element itself means the backdrop.
        if (e.target === e.currentTarget) close();
      }}
      // ponytail: the two UA <dialog> defaults .palette does not already
      // override — 1em of padding, and margin:auto centring it vertically
      // where the design puts it 12vh from the top.
      style={{ padding: 0, margin: "12vh auto auto" }}
    >
      <input
        type="text"
        value={query}
        placeholder={T.palettePlaceholder}
        aria-label={T.quickSearch}
        aria-controls={listId}
        aria-activedescendant={results[sel] ? rowId(results[sel].key) : undefined}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          } else if (e.key === "Enter" && results[sel]) {
            e.preventDefault();
            go(results[sel]);
          }
        }}
      />
      {/* Outside the listbox: a status line is not one of its options. */}
      {busy && <p className="pal-empty">{T.paletteSearching}</p>}
      {!busy && q && results.length === 0 && <p className="pal-empty">{T.paletteNoResults}</p>}
      <div className="pal-list" id={listId} role="listbox">
        {results.map((entry, i) => (
          <button
            key={entry.key}
            id={rowId(entry.key)}
            type="button"
            role="option"
            aria-selected={i === sel}
            ref={(el) => {
              if (el) rowRefs.current.set(entry.key, el);
              else rowRefs.current.delete(entry.key);
            }}
            className={`pal-item${i === sel ? " sel" : ""}`}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
            onClick={() => go(entry)}
          >
            <span className="item-label">{entry.label}</span>
            <span className="pal-cat">
              {entry.key.startsWith("node:") ? `${T.paletteHintTree} · ${entry.hint}` : entry.hint}
            </span>
          </button>
        ))}
      </div>
      {/* Inside the dialog, or the top layer would hide it: the card is
          position:fixed, so it still sits where cardPosition put it. */}
      {peek && <NodePreviewCard preview={preview} style={{ top: peek.top, left: peek.left }} />}
    </dialog>
  );
}
