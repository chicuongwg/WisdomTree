"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import { translate, type UiNextMessageKey } from "../localization";

type Destination = {
  href: string;
  labelKey: UiNextMessageKey;
  icon:
    | "overview"
    | "projects"
    | "calendar"
    | "work"
    | "people"
    | "search"
    | "graph"
    | "notifications"
    | "admin";
};

const destinations: Destination[] = [
  { href: "/app", labelKey: "nav.overview", icon: "overview" },
  { href: "/app/projects", labelKey: "nav.projects", icon: "projects" },
  { href: "/app/calendar", labelKey: "nav.calendar", icon: "calendar" },
  { href: "/app/my-work", labelKey: "nav.myWork", icon: "work" },
  { href: "/app/people", labelKey: "nav.people", icon: "people" },
  { href: "/app/search", labelKey: "nav.search", icon: "search" },
  { href: "/app/graph", labelKey: "nav.graph", icon: "graph" },
  { href: "/app/notifications", labelKey: "nav.notifications", icon: "notifications" },
];

function NavigationIcon({ icon }: { icon: Destination["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  if (icon === "overview") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" />
        <rect x="14" y="4" width="6" height="6" />
        <rect x="4" y="14" width="6" height="6" />
        <rect x="14" y="14" width="6" height="6" />
      </svg>
    );
  }
  if (icon === "projects") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <path d="M3.5 7.5h6l2-2h9v14h-17z" />
      </svg>
    );
  }
  if (icon === "work") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <path d="m5 12 4 4 10-10" />
      </svg>
    );
  }
  if (icon === "calendar") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="1.5" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }
  if (icon === "people") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 15c3.5-.5 5.6 1.2 6.5 4" />
      </svg>
    );
  }
  if (icon === "graph") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <circle cx="6" cy="8" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="16" cy="18" r="2" />
        <path d="m7.7 8.8 8.6-2M7.3 9.7l7.4 6.7M17.7 7.9l-1.3 8.2" />
      </svg>
    );
  }
  if (icon === "admin") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6M19 4v4M17 6h4" />
      </svg>
    );
  }
  if (icon === "notifications") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </svg>
  );
}

function isCurrent(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function GlobalNavigation({
  locale,
  onNavigate,
  canAccessAdministration = false,
}: {
  locale: UiLocale;
  onNavigate?: () => void;
  canAccessAdministration?: boolean;
}) {
  const pathname = usePathname();
  const availableDestinations = canAccessAdministration
    ? [
        ...destinations,
        { href: "/app/admin", labelKey: "nav.admin" as const, icon: "admin" as const },
      ]
    : destinations;
  return (
    <nav
      className="ui-next-global-nav grid gap-1"
      aria-label={translate(locale, "shell.primaryNavigation")}
    >
      {availableDestinations.map((destination) => {
        const label = translate(locale, destination.labelKey);
        const current = isCurrent(pathname, destination.href);
        return (
          <Link
            key={destination.href}
            href={destination.href}
            className={`ui-next-global-nav__link relative min-h-[2.75rem] flex items-center gap-3 border rounded px-3 py-2 text-sm font-semibold transition-colors ${
              current
                ? "border-ui-border bg-ui-surface text-ui-text shadow-[inset_0.25rem_0_var(--ui-color-primary)]"
                : "border-transparent text-ui-text-secondary hover:bg-ui-surface hover:text-ui-text"
            }`}
            aria-current={current ? "page" : undefined}
            data-label={label}
            title={label}
            onClick={onNavigate}
          >
            <span className="ui-next-global-nav__icon size-5 shrink-0">
              <NavigationIcon icon={destination.icon} />
            </span>
            <span className="ui-next-global-nav__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
