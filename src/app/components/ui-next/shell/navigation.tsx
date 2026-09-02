"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import { translate, type UiNextMessageKey } from "../localization";

type Destination = {
  href: string;
  labelKey: UiNextMessageKey;
  icon: "overview" | "projects" | "work" | "people" | "search";
};

const destinations: Destination[] = [
  { href: "/app", labelKey: "nav.overview", icon: "overview" },
  { href: "/app/projects", labelKey: "nav.projects", icon: "projects" },
  { href: "/app/my-work", labelKey: "nav.myWork", icon: "work" },
  { href: "/app/people", labelKey: "nav.people", icon: "people" },
  { href: "/app/search", labelKey: "nav.search", icon: "search" },
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
  if (icon === "people") {
    return (
      <svg viewBox="0 0 24 24" {...common} aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 15c3.5-.5 5.6 1.2 6.5 4" />
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
}: {
  locale: UiLocale;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="ui-next-global-nav" aria-label={translate(locale, "shell.primaryNavigation")}>
      {destinations.map((destination) => {
        const label = translate(locale, destination.labelKey);
        const current = isCurrent(pathname, destination.href);
        return (
          <Link
            key={destination.href}
            href={destination.href}
            className="ui-next-global-nav__link"
            aria-current={current ? "page" : undefined}
            data-label={label}
            title={label}
            onClick={onNavigate}
          >
            <span className="ui-next-global-nav__icon">
              <NavigationIcon icon={destination.icon} />
            </span>
            <span className="ui-next-global-nav__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
