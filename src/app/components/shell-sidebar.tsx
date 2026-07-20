"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { T } from "@/lib/vi";
import { NodeLink } from "./node-link";

// Contextual sidebar. Two labelled destination groups come first — knowledge
// surfaces and project/work surfaces — so the outline below can no longer be
// read as "these folders are my project". The outline itself is node-centric,
// not file-centric: a page row leads with its verification dot (the state of
// the knowledge, not a file type) and opens the same hover/focus preview card
// as every other node link, so the row behaves like a page reference rather
// than a file in a tree. The disclosure twisty stays on branch rows only.
// Data comes server-rendered from the layout (treeOutline).

export type OutlineBranch = {
  id: string;
  name: string;
  nodes: { id: string; title: string; verification: string }[];
};

export type RecentNode = { id: string; title: string; branchName: string };

export function ShellSidebar({
  branches,
  recent,
  role,
  spaceCount,
}: {
  branches: OutlineBranch[];
  recent: RecentNode[];
  role: string;
  spaceCount: number;
}) {
  const pathname = usePathname();

  // the branch holding the open page starts expanded
  const currentBranch = branches.find(
    (b) =>
      pathname === `/tree/branch/${b.id}` ||
      b.nodes.some((n) => pathname.startsWith(`/tree/node/${n.id}`)),
  );
  const [open, setOpen] = useState<Record<string, boolean>>(
    currentBranch ? { [currentBranch.id]: true } : {},
  );

  const knowledgeNav = [
    { href: "/graph", label: T.graph },
    { href: "/tree", label: T.tree },
    { href: "/tree/branches", label: T.navBranches },
  ];
  const workNav: { href: string; label: string }[] = [];
  if (role === "editor" || role === "admin_op") workNav.push({ href: "/board", label: T.board });
  workNav.push({ href: "/deadlines", label: T.deadline });

  const shortcuts: { href: string; label: string }[] = [
    { href: "/source/intake", label: T.sourceIntake },
    { href: "/source/mine", label: T.mySubmissions },
  ];
  if (role === "admin_op") {
    shortcuts.push(
      { href: "/source/inbox", label: T.sourceInbox },
      { href: "/catalog/admin", label: T.librarianDesk },
    );
  }

  return (
    <aside className="sidebar">
      <div className="side-head">
        <div className="space-name">{T.appName}</div>
        <div className="space-sub">
          {spaceCount} {T.yourSpaces}
        </div>
      </div>
      <button
        type="button"
        className="searchbox"
        onClick={() => window.dispatchEvent(new CustomEvent("wt:open-palette"))}
      >
        {T.quickSearch}…<kbd>Ctrl K</kbd>
      </button>
      <div className="side-body">
        <nav className="side-sec" aria-label={T.navKnowledge}>
          <div className="side-label side-label-know">{T.navKnowledge}</div>
          {knowledgeNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`tree-item nav-item${
                pathname === n.href || (n.href !== "/tree" && pathname.startsWith(n.href))
                  ? " active"
                  : ""
              }`}
            >
              <span className="item-label">{n.label}</span>
            </Link>
          ))}
        </nav>
        <nav className="side-sec" aria-label={T.navWork}>
          <div className="side-label side-label-work">{T.navWork}</div>
          {workNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`tree-item nav-item${pathname.startsWith(n.href) ? " active" : ""}`}
            >
              <span className="item-label">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-sec">
          <div className="side-label">
            {T.branch}
            {(role === "editor" || role === "admin_op") && (
              <Link href="/tree/branch/new" title={T.createBranch} aria-label={T.createBranch}>
                +
              </Link>
            )}
          </div>
          {branches.map((b) => {
            const expanded = !!open[b.id];
            return (
              <div key={b.id}>
                <button
                  type="button"
                  className="tree-item"
                  onClick={() => setOpen((s) => ({ ...s, [b.id]: !expanded }))}
                  aria-expanded={expanded}
                >
                  <span className="twisty" aria-hidden="true">
                    {expanded ? "▾" : "▸"}
                  </span>
                  <span className="item-label">{b.name}</span>
                </button>
                {expanded && (
                  <>
                    <Link
                      href={`/tree/branch/${b.id}`}
                      className={`tree-item depth-1${pathname === `/tree/branch/${b.id}` ? " active" : ""}`}
                    >
                      <span className="item-label muted">{T.openBranch}</span>
                    </Link>
                    {b.nodes.map((n) => (
                      <NodeLink
                        key={n.id}
                        nodeId={n.id}
                        verification={n.verification}
                        className={`tree-item node-item depth-1${pathname.startsWith(`/tree/node/${n.id}`) ? " active" : ""}`}
                      >
                        <span className="item-label">{n.title}</span>
                      </NodeLink>
                    ))}
                  </>
                )}
              </div>
            );
          })}
          {branches.length === 0 && <p className="pal-empty">{T.empty}</p>}
        </div>
        {recent.length > 0 && (
          <div className="side-sec">
            <div className="side-label">{T.recent}</div>
            {recent.map((n) => (
              <NodeLink
                key={n.id}
                nodeId={n.id}
                className={`tree-item node-item${pathname.startsWith(`/tree/node/${n.id}`) ? " active" : ""}`}
                title={`${n.title} — ${n.branchName}`}
              >
                <span className="item-label">{n.title}</span>
              </NodeLink>
            ))}
          </div>
        )}
        <div className="side-sec">
          <div className="side-label">{T.shortcuts}</div>
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`tree-item${pathname.startsWith(s.href) ? " active" : ""}`}
            >
              <span className="item-label">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
