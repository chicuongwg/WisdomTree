"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verificationStateLabel } from "@/lib/vi";
import {
  cardPosition,
  loadPreview,
  NodePreviewCard,
  PREVIEW_HOVER_DELAY_MS,
  type NodePreview,
} from "./node-link";
import { useShellCopy } from "./shell-locale-provider";

// Command palette (VS Code / Obsidian, Ctrl+K): full-text search over tree
// nodes via GET /api/tree/search, plus quick-open entries for every screen
// the current role can reach. Opened by the shortcut, the sidebar searchbox
// or the rail's search button (all three send "wt:open-palette").
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
  kind: "node" | "source";
  id: string;
  title: string;
  context: string;
  verification: string;
};

type Entry = { key: string; label: string; hint: string; href: string };

export function CommandPalette({ role }: { role: string }) {
  const T = useShellCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Which search the answers belong to; a stale answer is discarded. */
  const searchToken = useRef(0);
  const baseId = useId();
  const listId = `${baseId}list`;
  const rowId = (key: string) => `${baseId}${key}`;

  const screens: Entry[] = [
    // The map was missing from this list, and the palette is the ONLY way in
    // below 56rem: the side panel is hidden there and the rail's narrow-screen
    // button opens this dialog. A screen the app hides on a phone and does not
    // list in its own search is a screen a phone cannot reach at all.
    { key: "graph", label: T.graph, hint: T.paletteHintGo, href: "/graph" },
    { key: "tree", label: T.tree, hint: T.paletteHintGo, href: "/tree" },
    { key: "branches", label: T.navBranches, hint: T.paletteHintGo, href: "/tree/branches" },
    { key: "library", label: T.library, hint: T.paletteHintGo, href: "/library" },
    { key: "intake", label: T.sourceIntake, hint: T.paletteHintGo, href: "/source/intake" },
    { key: "mine", label: T.mySubmissions, hint: T.paletteHintGo, href: "/source/mine" },
    {
      key: "candidate-review",
      label: T.candidateReview,
      hint: T.navPersonalSpace,
      href: "/vault/review",
    },
    // These two say which space they belong to instead of the generic "đi
    // tới": the board and the deadline calendar are the pair readers mix up,
    // and the palette is often how they are reached.
    { key: "board", label: T.board, hint: T.navWork, href: "/board" },
    { key: "deadlines", label: T.deadline, hint: T.navProjects, href: "/deadlines" },
    {
      key: "notifications",
      label: T.notificationCenter,
      hint: T.paletteHintGo,
      href: "/notifications",
    },
    { key: "account", label: T.account, hint: T.paletteHintGo, href: "/account" },
    { key: "search", label: T.search, hint: T.paletteHintGo, href: "/search" },
  ];
  screens.push({
    key: "new-branch",
    label: T.createBranch,
    hint: T.paletteHintGo,
    href: "/tree/branch/new",
  });
  if (role === "editor" || role === "admin_op") {
    screens.push({ key: "review", label: T.reviewQueue, hint: T.paletteHintGo, href: "/review" });
  }
  if (role === "admin_op") {
    screens.push({
      key: "desk",
      label: T.librarianDesk,
      hint: T.paletteHintGo,
      href: "/library/loans",
    });
  }
  if (role === "admin_op") {
    screens.push({ key: "admin", label: T.adminConsole, hint: T.paletteHintGo, href: "/admin" });
  }
  if (role === "admin_op") {
    screens.push({
      key: "health",
      label: T.healthPageTitle,
      hint: T.paletteHintGo,
      href: "/admin/health",
    });
  }

  const q = query.trim().toLowerCase();
  const screenMatches = q
    ? // The hint counts as searchable text, so typing "dự án" finds Lịch dự án
      // even though the word is not in its name.
      screens.filter((s) => `${s.label} ${s.hint}`.toLowerCase().includes(q))
    : screens;
  const results: Entry[] = [
    ...hits.map((h) => ({
      key: `${h.kind}:${h.id}`,
      label: h.title,
      hint: h.kind === "node" ? `${h.context} · ${verificationStateLabel(h.verification)}` : `${h.context} · ${T.library}`,
      href: h.kind === "node" ? `/wiki/${h.id}` : `/library/${h.id}`,
    })),
    ...screenMatches,
  ];

  const close = () => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setSel(0);
    setHoveredKey(null);
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
    setFailed(false);
    // Type "lịch", then "lịch sử": if the first request answers second, its
    // results used to land on top of the newer ones and clear the spinner
    // early. The debounce alone cannot prevent that — it stops a request being
    // SENT, not one already in flight — so every answer carries the number of
    // the search it belongs to, and a stale one is dropped on the floor.
    const mine = ++searchToken.current;
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (!res.ok) throw new Error("search");
        const rows = ((await res.json()) as SearchHit[]).slice(0, 8);
        if (mine !== searchToken.current) return;
        setHits(rows);
      } catch {
        if (mine !== searchToken.current) return;
        // A search that failed is not a search that found nothing: saying
        // "Không có kết quả" about a broken request sends the reader off to
        // look for a page they were never told the app could not reach.
        setHits([]);
        setFailed(true);
      } finally {
        if (mine === searchToken.current) setBusy(false);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  useEffect(() => setSel(0), [query, hits.length]);

  // Selection follows both pointer and keyboard, but the preview is pointer
  // hover intent only: moving through results must not cover the list.
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const [peek, setPeek] = useState<{ top: number; left: number } | null>(null);
  const [preview, setPreview] = useState<NodePreview | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !hoveredKey?.startsWith("node:")) {
      setPeek(null);
      return;
    }
    setPreview(null);
    let alive = true;
    const timer = setTimeout(() => {
      const nodeId = hoveredKey.slice(5);
      const row = rowRefs.current.get(hoveredKey);
      if (row) setPeek(cardPosition(row));
      void loadPreview(nodeId).then((p) => alive && setPreview(p));
    }, PREVIEW_HOVER_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, hoveredKey]);

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
      {/* Outside the listbox: a status line is not one of its options. It is a
          live region because focus never leaves the input — without one, a
          reader who cannot see the list is told nothing when it empties or
          when the search is still running. */}
      <div role="status" aria-live="polite">
        {busy && <p className="pal-empty">{T.paletteSearching}</p>}
        {!busy && q && results.length === 0 && (
          <p className={failed ? "pal-empty error-text" : "pal-empty"}>
            {failed ? T.paletteSearchFailed : T.paletteNoResults}
          </p>
        )}
      </div>
      <div className="pal-list" id={listId} role="listbox">
        {results.map((entry, i) => (
          <button
            key={entry.key}
            id={rowId(entry.key)}
            type="button"
            role="option"
            aria-selected={i === sel}
            /* Out of the tab order: the input owns the keyboard here and
               points at the chosen row with aria-activedescendant. Left
               tabbable, Tab walked every result and DOM focus drifted away
               from the row aria-selected was naming. Still clickable. */
            tabIndex={-1}
            ref={(el) => {
              if (el) rowRefs.current.set(entry.key, el);
              else rowRefs.current.delete(entry.key);
            }}
            className={`pal-item${i === sel ? " sel" : ""}`}
            onMouseEnter={() => {
              setSel(i);
              setHoveredKey(entry.key);
            }}
            onMouseLeave={() => setHoveredKey(null)}
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
