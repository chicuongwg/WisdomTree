"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useShortcutKey } from "@/lib/platform";
import { NodeLink } from "./node-link";
import { useShellCopy } from "./shell-locale-provider";

// Contextual sidebar redesigned with a segmented controller:
//   - VIỆC CHUNG: team knowledge, team branches, team projects & deadlines
//   - CÁ NHÂN: personal space, private note branches, daily workbench & my submissions

export type OutlineBranch = {
  id: string;
  name: string;
  nodes: { id: string; title: string; verification: string }[];
};

export type RecentNode = { id: string; title: string; branchName: string };

function BranchSection({ branch, pathname }: { branch?: OutlineBranch; pathname: string }) {
  const T = useShellCopy();
  const nodes = branch?.nodes ?? [];
  const currentBranch = Boolean(
    branch &&
    (pathname === `/tree/branch/${branch.id}` ||
      nodes.some((n) => pathname.startsWith(`/tree/node/${n.id}`))),
  );

  const [open, setOpen] = useState(currentBranch);

  useEffect(() => {
    if (currentBranch) {
      setOpen(true);
    }
  }, [currentBranch]);

  if (!branch) return null;
  const isOpen = open;

  return (
    <div>
      <button
        type="button"
        className="tree-item"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={isOpen}
      >
        <span className="twisty" aria-hidden="true">
          {isOpen ? "▾" : "▸"}
        </span>
        <span className="item-label">{branch.name}</span>
      </button>
      {isOpen && (
        <>
          <Link
            href={`/tree/branch/${branch.id}`}
            className={`tree-item depth-1${pathname === `/tree/branch/${branch.id}` ? " active" : ""}`}
            aria-current={pathname === `/tree/branch/${branch.id}` ? "page" : undefined}
          >
            <span className="item-label muted">{T.openBranch}</span>
          </Link>
          {nodes.map((n) => (
            <NodeLink
              key={n.id}
              nodeId={n.id}
              verification={n.verification}
              className={`tree-item node-item depth-1${pathname.startsWith(`/tree/node/${n.id}`) ? " active" : ""}`}
              aria-current={pathname.startsWith(`/tree/node/${n.id}`) ? "page" : undefined}
            >
              <span className="item-label">{n.title}</span>
            </NodeLink>
          ))}
        </>
      )}
    </div>
  );
}

function SidebarContent({
  teamBranches = [],
  personalBranches = [],
  recent = [],
  role = "user",
  capabilities = [],
  spaceCount = 0,
}: {
  teamBranches?: OutlineBranch[];
  personalBranches?: OutlineBranch[];
  recent?: RecentNode[];
  role?: string;
  capabilities?: string[];
  spaceCount?: number;
}) {
  const T = useShellCopy();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const shortcut = useShortcutKey();

  const safeTeamBranches = Array.isArray(teamBranches) ? teamBranches : [];
  const safePersonalBranches = Array.isArray(personalBranches) ? personalBranches : [];
  const safeRecent = Array.isArray(recent) ? recent : [];

  const currentScope = searchParams?.get("scope") ?? "team";

  function defaultTabFor(path: string, scopeParam: string | null): "team" | "personal" {
    if (scopeParam === "personal") return "personal";
    if (
      path.startsWith("/board") ||
      path.startsWith("/librarian") ||
      path.startsWith("/source/intake") ||
      path.startsWith("/source/mine") ||
      path.startsWith("/vault/review")
    ) {
      return "personal";
    }
    if (
      safePersonalBranches.some(
        (b) =>
          path === `/tree/branch/${b.id}` ||
          b.nodes.some((n) => path.startsWith(`/tree/node/${n.id}`)),
      )
    ) {
      return "personal";
    }
    return "team";
  }

  const [activeTab, setActiveTab] = useState<"team" | "personal">(() =>
    defaultTabFor(pathname, currentScope),
  );

  useEffect(() => {
    setActiveTab(defaultTabFor(pathname, currentScope));
  }, [pathname, currentScope]);

  const teamProjects: { href: string; label: string }[] = [
    { href: "/deadlines", label: T.deadline },
    { href: "/catalog", label: T.catalog },
  ];
  if (capabilities.includes("catalog.manage")) {
    teamProjects.push({ href: "/catalog/admin", label: T.librarianDesk });
  }
  if (capabilities.includes("content.review")) {
    teamProjects.push({ href: "/source/inbox", label: T.sourceInbox });
  }
  if (capabilities.includes("system.operate")) {
    teamProjects.push({ href: "/admin/health", label: T.healthPageTitle });
  }

  const personalWork: { href: string; label: string }[] = [
    { href: "/vault/review", label: T.candidateReview },
    { href: "/librarian", label: T.aiLibrarian },
    { href: "/board", label: T.board },
    { href: "/source/intake", label: T.sourceIntake },
    { href: "/source/mine", label: T.mySubmissions },
  ];

  const recentForTab = safeRecent.filter((n) =>
    activeTab === "personal"
      ? safePersonalBranches.some((b) => b.name === n.branchName)
      : !safePersonalBranches.some((b) => b.name === n.branchName),
  );

  return (
    <aside className="sidebar" aria-label={T.navPanel}>
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
        {T.quickSearch}…<kbd>{shortcut} K</kbd>
      </button>

      <div className="side-switcher" role="tablist" aria-label={T.workspaceKind}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "team"}
          className={`side-switch-btn ${activeTab === "team" ? "active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          Việc chung
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "personal"}
          className={`side-switch-btn ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => setActiveTab("personal")}
        >
          Cá nhân
        </button>
      </div>

      <div className="side-body">
        {activeTab === "team" ? (
          <>
            {/* ── KHO DỰ ÁN CHUNG ───────────────────────────────── */}
            <nav className="side-sec" aria-label={T.navTeamKnowledge}>
              <div className="side-label side-label--team">{T.navTeamKnowledge}</div>
              {(
                [
                  { href: "/graph", label: T.navTeamGraph },
                  { href: "/tree", label: T.tree },
                  { href: "/tree/branches", label: T.navBranches },
                ] as { href: string; label: string }[]
              ).map((n) => {
                const here =
                  n.href === "/graph"
                    ? pathname === "/graph" && currentScope !== "personal"
                    : pathname === n.href || (n.href !== "/tree" && pathname.startsWith(n.href));
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`tree-item nav-item${here ? " active" : ""}`}
                    aria-current={here ? "page" : undefined}
                  >
                    <span className="item-label">{n.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Team branches outline */}
            <div className="side-sec">
              <div className="side-label side-label--team">
                {T.branch}
                {(role === "editor" || role === "admin_op") && (
                  <Link href="/tree/branch/new" title={T.createBranch} aria-label={T.createBranch}>
                    +
                  </Link>
                )}
              </div>
              {safeTeamBranches.map((b) => (
                <BranchSection key={b.id} branch={b} pathname={pathname} />
              ))}
              {safeTeamBranches.length === 0 && <p className="pal-empty">{T.empty}</p>}
            </div>

            {/* ── QUẢN LÝ DỰ ÁN (VIỆC CHUNG) ────────────────────── */}
            <nav className="side-sec" aria-label={T.navProjects}>
              <div className="side-label">{T.navProjects}</div>
              <p className="side-hint">{T.navProjectsHint}</p>
              {teamProjects.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`tree-item nav-item${pathname.startsWith(n.href) ? " active" : ""}`}
                  aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                >
                  <span className="item-label">{n.label}</span>
                </Link>
              ))}
            </nav>
          </>
        ) : (
          <>
            {/* ── KHÔNG GIAN CỦA TÔI ────────────────────────────── */}
            <nav className="side-sec" aria-label={T.navPersonalSpace}>
              <div className="side-label side-label--personal">{T.navPersonalSpace}</div>
              {(
                [{ href: "/graph?scope=personal", label: T.navPersonalGraph }] as {
                  href: string;
                  label: string;
                }[]
              ).map((n) => {
                const here = pathname === "/graph" && currentScope === "personal";
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`tree-item nav-item${here ? " active" : ""}`}
                    aria-current={here ? "page" : undefined}
                  >
                    <span className="item-label">{n.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Personal branches outline */}
            <div className="side-sec">
              <div className="side-label side-label--personal">
                {T.navPersonalNotes}
                <Link
                  href="/tree/branch/new?scope=personal"
                  title="Tạo chuyên đề cá nhân"
                  aria-label="Tạo chuyên đề cá nhân"
                >
                  +
                </Link>
              </div>
              {safePersonalBranches.map((b) => (
                <BranchSection key={b.id} branch={b} pathname={pathname} />
              ))}
              {safePersonalBranches.length === 0 && (
                <p className="side-hint">{T.personalBranchEmpty}</p>
              )}
            </div>

            {/* ── CÔNG VIỆC HẰNG NGÀY (CÁ NHÂN) ──────────────────── */}
            <nav className="side-sec" aria-label={T.navWork}>
              <div className="side-label">{T.navWork}</div>
              <p className="side-hint">{T.navWorkHint}</p>
              {personalWork.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`tree-item nav-item${pathname.startsWith(n.href) ? " active" : ""}`}
                  aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                >
                  <span className="item-label">{n.label}</span>
                </Link>
              ))}
            </nav>
          </>
        )}

        {/* ── GẦN ĐÂY ──────────────────────────────────────── */}
        {recentForTab.length > 0 && (
          <div className="side-sec">
            <div className="side-label">{T.recent}</div>
            {recentForTab.map((n) => (
              <NodeLink
                key={n.id}
                nodeId={n.id}
                className={`tree-item node-item${pathname.startsWith(`/tree/node/${n.id}`) ? " active" : ""}`}
                title={`${n.title} — ${n.branchName}`}
                aria-current={pathname.startsWith(`/tree/node/${n.id}`) ? "page" : undefined}
              >
                <span className="item-label">{n.title}</span>
              </NodeLink>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export function ShellSidebar(props: {
  teamBranches?: OutlineBranch[];
  personalBranches?: OutlineBranch[];
  recent?: RecentNode[];
  role?: string;
  capabilities?: string[];
  spaceCount?: number;
}) {
  const T = useShellCopy();
  return (
    <Suspense fallback={<aside className="sidebar" aria-label={T.navPanel} />}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
