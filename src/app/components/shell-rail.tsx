"use client";

import type { ReactNode } from "react";
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
  /** extra path prefixes that light this item up */
  also?: string[];
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
};

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

  const items: RailItem[] = [
    { href: "/graph", label: T.graph, icon: icons.graph },
    { href: "/tree", label: T.tree, icon: icons.tree },
    { href: "/library", label: T.library, icon: icons.library, also: ["/source"] },
    { href: "/catalog", label: T.catalog, icon: icons.catalog },
    { href: "/deadlines", label: T.deadline, icon: icons.deadlines },
    // Every role: pm.board.read is global, and unheld work is a pool anyone
    // may take from.
    { href: "/board", label: T.board, icon: icons.board },
  ];
  if (role === "admin_op") {
    items.push({ href: "/review", label: T.reviewQueue, icon: icons.review, pip: reviewOpen });
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
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rail-btn"
          title={item.label}
          aria-label={
            item.pip ? `${item.label} (${item.pip} ${T.unread.toLowerCase()})` : item.label
          }
          aria-current={isActive(item) ? "page" : undefined}
        >
          {item.icon}
          {item.pip ? <span className="pip">{item.pip > 99 ? "99+" : item.pip}</span> : null}
        </Link>
      ))}
      {/* ponytail: below 56rem the sidebar is display:none, and six screens
          (nộp nguồn, bài nộp của tôi, hộp nguồn, bàn thủ thư, danh sách
          chuyên đề, chuyên đề mới) live only there. Rather than a second
          mobile nav, this opens the palette, which already indexes all six. */}
      <button
        type="button"
        className="rail-btn"
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
