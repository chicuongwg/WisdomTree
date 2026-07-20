"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { T, verificationLabel } from "@/lib/vi";

// Command palette (VS Code / Obsidian, Ctrl+K): full-text search over tree
// nodes via GET /api/tree/search, plus quick-open entries for every screen
// the current role can reach. Opened by the shortcut or the sidebar
// searchbox ("wt:open-palette").

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
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const screens: Entry[] = [
    { key: "tree", label: T.tree, hint: T.paletteHintGo, href: "/tree" },
    { key: "library", label: T.library, hint: T.paletteHintGo, href: "/library" },
    { key: "catalog", label: T.catalog, hint: T.paletteHintGo, href: "/catalog" },
    { key: "intake", label: T.sourceIntake, hint: T.paletteHintGo, href: "/source/intake" },
    { key: "mine", label: T.mySubmissions, hint: T.paletteHintGo, href: "/source/mine" },
    { key: "deadlines", label: T.deadline, hint: T.paletteHintGo, href: "/deadlines" },
    { key: "notifications", label: T.notificationCenter, hint: T.paletteHintGo, href: "/notifications" },
  ];
  if (role === "editor" || role === "admin_op") {
    screens.push(
      { key: "board", label: T.board, hint: T.paletteHintGo, href: "/board" },
      { key: "new-branch", label: T.createBranch, hint: T.paletteHintGo, href: "/tree/branch/new" },
    );
  }
  if (role === "admin_op") {
    screens.push(
      { key: "review", label: T.reviewQueue, hint: T.paletteHintGo, href: "/review" },
      { key: "inbox", label: T.sourceInbox, hint: T.paletteHintGo, href: "/source/inbox" },
      { key: "desk", label: T.librarianDesk, hint: T.paletteHintGo, href: "/catalog/admin" },
    );
  }

  const q = query.trim().toLowerCase();
  const screenMatches = q
    ? screens.filter((s) => s.label.toLowerCase().includes(q))
    : screens;
  const results: Entry[] = [
    ...hits.map((h) => ({
      key: `node:${h.id}`,
      label: h.title,
      hint: `${h.branchName} · ${verificationLabel[h.verification] ?? h.verification}`,
      href: `/tree/node/${h.id}`,
    })),
    ...screenMatches,
  ];

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setSel(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        close();
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wt:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wt:open-palette", onOpen);
    };
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
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

  if (!open) return null;

  const go = (entry: Entry) => {
    close();
    router.push(entry.href);
  };

  return (
    <div
      className="palette-veil"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label={T.quickSearch}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={T.palettePlaceholder}
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
        <div className="pal-list">
          {busy && <p className="pal-empty">{T.paletteSearching}</p>}
          {!busy && q && results.length === 0 && <p className="pal-empty">{T.paletteNoResults}</p>}
          {results.map((entry, i) => (
            <button
              key={entry.key}
              type="button"
              className={`pal-item${i === sel ? " sel" : ""}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(entry)}
            >
              <span className="item-label">{entry.label}</span>
              <span className="pal-cat">
                {entry.key.startsWith("node:") ? `${T.paletteHintTree} · ${entry.hint}` : entry.hint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
