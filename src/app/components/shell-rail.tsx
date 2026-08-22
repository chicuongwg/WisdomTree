"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShellCopy } from "./shell-locale-provider";
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
  search: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
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

/**
 * The folded state as an external store, because that is what it already is:
 * one attribute on <html>, written by the pre-paint script, read by the CSS
 * grid, and shared by two components that never meet in the tree.
 */
const sidebarWatchers = new Set<() => void>();
const subscribeSidebar = (onChange: () => void) => {
  sidebarWatchers.add(onChange);
  return () => {
    sidebarWatchers.delete(onChange);
  };
};
const readSidebar = () => document.documentElement.dataset.sidebar === "collapsed";
function writeSidebar(collapsed: boolean): void {
  // The grid column lives in CSS, keyed off this one attribute — no layout
  // state has to be threaded from the rail down to a sibling component.
  document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "open";
  try {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "open");
  } catch {
    // Quota or private mode: it still collapses, it just won't remember.
  }
  for (const notify of sidebarWatchers) notify();
}

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
  const T = useShellCopy();
  const roleLabel =
    role === "admin_op" ? T.roleAdmin : role === "editor" ? T.roleEditor : T.roleUser;
  const pathname = usePathname();
  /**
   * Whether the panel is folded, read from the one place that already knows:
   * the attribute on <html>. Not React state — the attribute IS the state, the
   * CSS grid keys off it, and the pre-paint script writes it before React
   * exists.
   *
   * The version this replaces seeded useState from that attribute in a lazy
   * initializer, with a comment claiming the initializer "runs on the client
   * only" and so could not disagree with the server. It does run on the client
   * — including during HYDRATION, which is a client render that must produce
   * exactly the server's HTML. With the panel collapsed, the server said
   * title="Thu gọn thanh bên" and hydration said "Mở rộng thanh bên", which is
   * the mismatch React reports. The comment described the trap and then walked
   * into it.
   *
   * useSyncExternalStore is the shape that has no such gap: React renders
   * getServerSnapshot() during hydration — matching the HTML by construction —
   * and re-renders with the live value immediately after. Same pattern as
   * useMedia in knowledge-map.tsx and useShortcutKey in lib/platform.ts.
   */
  const collapsed = useSyncExternalStore(subscribeSidebar, readSidebar, () => false);

  // localStorage is the durable answer, and the attribute is re-stamped from
  // it at mount: the pre-paint script cannot run in a browser that blocked it.
  useEffect(() => {
    let saved = false;
    try {
      saved = window.localStorage.getItem(SIDEBAR_KEY) === "collapsed";
    } catch {
      // Private browsing throws on localStorage; an expanded panel is fine.
    }
    writeSidebar(saved);
  }, []);

  const togglePanel = () => writeSidebar(!collapsed);

  const knowledgeItems: RailItem[] = [
    { href: "/library", label: T.library, icon: icons.library, also: ["/source"] },
    { href: "/tree", label: T.tree, icon: icons.tree },
    { href: "/graph", label: T.graph, icon: icons.graph },
  ];
  const workItems: RailItem[] = [
    // Same order as the sidebar: the day's board first, then the project
    // calendar, which is a different space and says so in its tooltip.
    // Every role: pm.board.read is global, and unheld work is a pool anyone
    // may take from.
    { href: "/board", label: T.board, icon: icons.board, group: T.navWork },
    { href: "/deadlines", label: T.deadline, icon: icons.deadlines, group: T.navProjects },
  ];
  const roleItems: RailItem[] = [];
  if (role === "editor" || role === "admin_op") {
    roleItems.push({
      href: "/review",
      label: T.reviewQueue,
      icon: icons.review,
      pip: reviewOpen,
      pipNoun: T.pipOpenTasks,
    });
  }
  if (role === "admin_op") {
    roleItems.push({ href: "/admin", label: T.adminConsole, icon: icons.gear });
  }
  const notificationItem: RailItem = {
    href: "/notifications",
    label: T.notificationCenter,
    icon: icons.bell,
    pip: unread,
  };

  /**
   * How current an item is. The rail names MODULES, not pages: on
   * /source/mine, "Kho tư liệu" is the module you are in, and the sidebar's
   * own shortcut is the page you are on. Marking both `aria-current="page"`
   * announced two current pages in one document, which is one more than a
   * document can have.
   *
   * So the exact match keeps "page" (the rail item IS the page, e.g. /board),
   * and a module match takes "true" — ARIA's "current item within a set",
   * which is exactly what a highlighted activity-bar icon means. The left seal
   * bar in CSS keys off both, so nothing changes visually.
   */
  const current = (item: RailItem): "page" | "true" | undefined => {
    if (pathname === item.href) return "page";
    const inModule =
      pathname.startsWith(`${item.href}/`) ||
      (item.also ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
    return inModule ? "true" : undefined;
  };

  const initials = displayName.split(/\s+/).filter(Boolean).slice(-1)[0]?.slice(0, 2);

  const itemLink = (item: RailItem) => {
    const name = item.group ? `${item.group} · ${item.label}` : item.label;
    return (
      <Link
        key={item.href}
        href={item.href}
        className="rail-btn"
        title={name}
        aria-label={
          item.pip ? `${name} (${item.pip} ${(item.pipNoun ?? T.unread).toLowerCase()})` : name
        }
        aria-current={current(item)}
      >
        {item.icon}
        {item.pip ? <span className="pip">{item.pip > 99 ? "99+" : item.pip}</span> : null}
      </Link>
    );
  };

  return (
    <nav className="rail" aria-label={T.modules}>
      <Link href="/" className="brand-mark" title={T.home} aria-label={T.home}>
        WT
      </Link>
      {/* Directly under the home mark, above the modules (owner decision
          2026-07-21). It sat at the foot of the rail before, beside the theme
          toggle and the avatar — the corner where an app puts the settings
          nobody presses twice a day. This one is pressed whenever the work
          needs the width, so it belongs at the top with the chrome it
          controls, not filed with the preferences.
          Folds the side panel away and does nothing else. Every role gets it:
          there is no permission attached to how much of your own screen the
          chrome takes. Hidden below 56rem, where the panel is already
          display:none and "collapse" would be a button that changes nothing. */}
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
          own search box. The collapse button is hidden at that width, so the
          palette keeps a door of its own on narrow screens rather than being
          left to Ctrl+K, which a phone does not have. */}
      <button
        type="button"
        className="rail-btn only-narrow"
        title={T.quickSearch}
        aria-label={T.quickSearch}
        onClick={() => window.dispatchEvent(new CustomEvent("wt:open-palette"))}
      >
        {icons.search}
      </button>
      <span className="rail-divider" aria-hidden="true" />
      {knowledgeItems.map(itemLink)}
      <span className="rail-divider" aria-hidden="true" />
      {workItems.map(itemLink)}
      {roleItems.length > 0 && <span className="rail-divider" aria-hidden="true" />}
      {roleItems.map(itemLink)}
      <span className="rail-spacer" />
      {itemLink(notificationItem)}
      <ThemeToggle />
      {/* The avatar is the door to the member's own settings — same corner
          convention as every workspace app. */}
      <Link
        href="/account"
        className="rail-avatar"
        title={`${displayName} · ${roleLabel}`}
        aria-label={T.account}
        aria-current={pathname.startsWith("/account") ? "page" : undefined}
      >
        {/* Session-guarded same-origin route; next/image adds nothing at 1.85rem. */}
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
      </Link>
    </nav>
  );
}
