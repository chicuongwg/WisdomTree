"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { T, userRoleLabel } from "@/lib/vi";
import { ThemeToggle } from "./theme-toggle";

// Activity bar (VS Code / Discord): one icon per module, vermilion pip for
// pending counts, left seal-red edge marks the active module.

type RailItem = {
  href: string;
  label: string;
  icon: ReactNode;
  pip?: number;
  /** What the pip counts, in words. "3 chưa đọc" is wrong for a review queue. */
  pipNoun?: string;
  /** extra path prefixes that light this item up */
  also?: string[];
  /**
   * The space this icon belongs to, shown before its name in the tooltip. The
   * rail has no room for headings, so for the two items readers kept mixing up
   * — the day's board and the project calendar — the tooltip is where the
   * grouping gets said.
   */
  group?: string;
};

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const icons = {
  tree: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M12 4v5m0 0c-3 0-5 2-5 5m5-5c3 0 5 2 5 5M7 14v5m10-5v5M12 9v11" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="7" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
    </svg>
  ),
  graph: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="7" r="2" />
      <circle cx="7" cy="19" r="2" />
      <path d="M6.6 7.4 10 10.2M17.4 8.4 14.2 10.6M10.6 13.8 8.2 17.2" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 5h5l2 2h9v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5z" />
    </svg>
  ),
  catalog: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M5 4h6v16H5zM11 4h6l2 16h-6z" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="4" width="4.6" height="14" rx="1" />
      <rect x="9.7" y="4" width="4.6" height="9" rx="1" />
      <rect x="15.4" y="4" width="4.6" height="11" rx="1" />
    </svg>
  ),
  deadlines: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4m8-4v4M4 10h16" />
    </svg>
  ),
  review: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10.5 19a2 2 0 0 0 3 0" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20M6.3 6.3l1.8 1.8M15.9 15.9l1.8 1.8M17.7 6.3l-1.8 1.8M8.1 15.9l-1.8 1.8" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.1" />
      <circle cx="12" cy="12" r="1.1" />
      <circle cx="18.5" cy="12" r="1.1" />
    </svg>
  ),
  // A pane with one column shaded off: the button says what it does, which
  // three dots never did. The owner pointed at the button by its position
  // ("ngay dưới icon chuông"), not by its shape.
  panel: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M10 5v14" />
    </svg>
  ),
};

/**
 * Is the side panel folded away? One namespaced key, same discipline as the
 * graph settings: written here, read back in an effect and never during
 * render, because the server has no localStorage and a collapsed panel that
 * disagreed with the server HTML would be a hydration error on every load.
 * The pre-paint script in layout.tsx reads the same key to avoid a flash.
 */
const SIDEBAR_KEY = "wisdomtree.sidebar";

export function ShellRail({
  role,
  displayName,
  avatarUrl,
  unread,
  reviewOpen,
}: {
  role: string;
  displayName: string;
  /** Cache-busted /api/avatar URL, or null for the initials fallback. */
  avatarUrl: string | null;
  unread: number;
  reviewOpen: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Read once, after mount. The attribute is stamped here as well as in the
  // state so the very first paint after hydration already agrees with what the
  // reader last chose.
  useEffect(() => {
    let saved = false;
    try {
      saved = window.localStorage.getItem(SIDEBAR_KEY) === "collapsed";
    } catch {
      // Private browsing throws on localStorage; an expanded panel is fine.
    }
    setCollapsed(saved);
    document.documentElement.dataset.sidebar = saved ? "collapsed" : "open";
  }, []);

  function togglePanel() {
    const next = !collapsed;
    setCollapsed(next);
    // The grid column lives in CSS, keyed off this one attribute — no layout
    // state has to be threaded from the rail down to a sibling component.
    document.documentElement.dataset.sidebar = next ? "collapsed" : "open";
    try {
      window.localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "open");
    } catch {
      // Quota or private mode: it still collapses, it just won't remember.
    }
  }

  const items: RailItem[] = [
    { href: "/graph", label: T.graph, icon: icons.graph },
    { href: "/tree", label: T.tree, icon: icons.tree },
    { href: "/library", label: T.library, icon: icons.library, also: ["/source"] },
    { href: "/catalog", label: T.catalog, icon: icons.catalog },
    // Same order as the sidebar: the day's board first, then the project
    // calendar, which is a different space and says so in its tooltip.
    // Every role: pm.board.read is global, and unheld work is a pool anyone
    // may take from.
    { href: "/board", label: T.board, icon: icons.board, group: T.navWork },
    { href: "/deadlines", label: T.deadline, icon: icons.deadlines, group: T.navProjects },
  ];
  if (role === "admin_op") {
    items.push({
      href: "/review",
      label: T.reviewQueue,
      icon: icons.review,
      pip: reviewOpen,
      pipNoun: T.pipOpenTasks,
    });
    items.push({ href: "/admin", label: T.adminConsole, icon: icons.gear });
  }
  items.push({ href: "/notifications", label: T.notificationCenter, icon: icons.bell, pip: unread });

  const isActive = (item: RailItem) =>
    pathname.startsWith(item.href) || (item.also ?? []).some((p) => pathname.startsWith(p));

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-1)[0]
    ?.slice(0, 2);

  return (
    <nav className="rail" aria-label={T.modules}>
      <Link href="/" className="brand-mark" title={T.home} aria-label={T.home}>
        WT
      </Link>
      {items.map((item) => {
        const name = item.group ? `${item.group} · ${item.label}` : item.label;
        return (
        <Link
          key={item.href}
          href={item.href}
          className="rail-btn"
          title={name}
          aria-label={
            item.pip
              ? `${name} (${item.pip} ${(item.pipNoun ?? T.unread).toLowerCase()})`
              : name
          }
          aria-current={isActive(item) ? "page" : undefined}
        >
          {item.icon}
          {item.pip ? <span className="pip">{item.pip > 99 ? "99+" : item.pip}</span> : null}
        </Link>
        );
      })}
      {/* Folds the side panel away to widen the work area, and does nothing
          else (owner decision 2026-07-21). Every role gets it: there is no
          permission attached to how much of your own screen the chrome takes.
          Hidden below 56rem, where the panel is already display:none and
          "collapse" would be a button that changes nothing. */}
      <button
        type="button"
        className="rail-btn only-wide"
        title={collapsed ? T.expandPanel : T.collapsePanel}
        aria-label={collapsed ? T.expandPanel : T.collapsePanel}
        aria-pressed={collapsed}
        onClick={togglePanel}
      >
        {icons.panel}
      </button>
      {/* ponytail: below 56rem the sidebar is display:none, and six screens
          (nộp nguồn, bài nộp của tôi, hộp nguồn, bàn thủ thư, danh sách
          chuyên đề, chuyên đề mới) live only there — including the palette's
          own search box. The collapse button took this slot, so the palette
          keeps a door of its own on narrow screens rather than being left to
          Ctrl+K, which a phone does not have. */}
      <button
        type="button"
        className="rail-btn only-narrow"
        title={T.quickSearch}
        aria-label={T.quickSearch}
        onClick={() => window.dispatchEvent(new CustomEvent("wt:open-palette"))}
      >
        {icons.more}
      </button>
      <span className="rail-spacer" />
      <ThemeToggle />
      {/* The avatar is the door to the member's own settings — same corner
          convention as every workspace app. */}
      <Link
        href="/account"
        className="rail-avatar"
        title={`${displayName} · ${userRoleLabel(role)}`}
        aria-label={T.account}
        aria-current={pathname.startsWith("/account") ? "page" : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- session-guarded
            same-origin route; next/image cannot add anything at 1.85rem */}
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
      </Link>
    </nav>
  );
}
