import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/modules/auth/session";
import { unreadCount } from "@/modules/notify/service";
import { recentNodes, treeOutline } from "@/modules/knowledge/service";
import { listReviewQueue } from "@/modules/storage/curation";
import { T, userRoleLabel } from "@/lib/vi";
import { LogoutButton } from "./components/logout-button";
import { ShellRail } from "./components/shell-rail";
import { ShellSidebar } from "./components/shell-sidebar";
import { CommandPalette } from "./components/command-palette";
import { ValidationMessages } from "./components/validation-messages";

export const metadata: Metadata = {
  // A template, so every screen's own title reads "<screen> · WisdomTree" and
  // the bare app name is left for the home page. Before this the layout held
  // the ONLY metadata in the app: every tab, every bookmark and every entry in
  // a reader's history said "WisdomTree" and nothing else, which makes the
  // browser's own back list — the one navigation aid no app can replace —
  // useless.
  title: { default: "WisdomTree", template: "%s · WisdomTree" },
  description: "Nền tảng lưu trữ và tri thức của nhóm",
};

export const dynamic = "force-dynamic";

// Stamps the persisted (or OS-preferred) theme on <html> before first paint
// so the dark theme never flashes light. The side panel rides along for the
// same reason: the rail reads the key in an effect, and without this the panel
// would appear and then fold away on every full page load.
const themeScript = `try{var t=localStorage.getItem("wt-theme");if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.dataset.theme=t;var s=localStorage.getItem("wisdomtree.sidebar");if(s)document.documentElement.dataset.sidebar=s;}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  if (!user) {
    return (
      <html lang="vi" suppressHydrationWarning>
        {/* See the note on the signed-in <body> below. */}
        <body suppressHydrationWarning>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          <ValidationMessages />
          <div className="plain-shell">
            <header className="topbar">
              <Link href="/" className="brand">
                <span className="brand-mark" aria-hidden="true">
                  WT
                </span>
                {T.appName}
              </Link>
            </header>
            {children}
          </div>
        </body>
      </html>
    );
  }

  const principal = {
    userId: user.id,
    role: user.role,
    spaceIds: user.spaceIds,
    spaceMemberships: user.spaceMemberships,
    capabilities: user.capabilities,
    vaultIds: user.vaultIds,
    vaultGrants: user.vaultGrants,
  };
  const [unread, outline, recent, reviewTasks] = await Promise.all([
    unreadCount(principal),
    treeOutline(principal),
    recentNodes(principal, 6),
    user.capabilities.includes("content.review")
      ? listReviewQueue(principal, {})
      : Promise.resolve([]),
  ]);
  const reviewOpen = reviewTasks.filter((t) =>
    ["queued", "assigned", "in_review", "changes_requested"].includes(t.state),
  ).length;

  // Defensively handle HMR / cached server bundles where treeOutline might still
  // return an array instead of { team, personal }.
  const teamBranches = Array.isArray(outline) ? outline : (outline?.team ?? []);
  const personalBranches = Array.isArray(outline) ? [] : (outline?.personal ?? []);

  return (
    <html lang="vi" suppressHydrationWarning>
      {/* suppressHydrationWarning reaches one level only, so <body> needs its
          own: browser extensions (Grammarly and friends) stamp attributes on
          <body> before React hydrates, and that is not our mismatch to fix. */}
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Bỏ qua điều hướng
        </a>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="shell">
          <ShellRail
            role={user.role}
            displayName={user.displayName}
            avatarUrl={
              user.avatarKey
                ? `/api/avatar/${user.id}?v=${encodeURIComponent(user.avatarKey)}`
                : null
            }
            unread={unread}
            reviewOpen={reviewOpen}
          />
          <ShellSidebar
            teamBranches={teamBranches}
            personalBranches={personalBranches}
            recent={recent.map((n) => ({ id: n.id, title: n.title, branchName: n.branchName }))}
            role={user.role}
            spaceCount={user.spaceIds.length}
          />
          {/* ponytail: tabIndex 0, not -1. The skip link only needs a
              focusable target (either value would do), but .main-area is also
              the app's scroll container (overflow-y: auto), and a scroll
              container is keyboard-scrollable only when it is in the tab
              order — -1 would land the skip link and leave the reader unable
              to page through the content they just skipped to. One attribute,
              both jobs. */}
          <div className="main-area" id="main" tabIndex={0}>
            {children}
          </div>
          <footer className="statusbar">
            <Link href="/account" className="sb-item sb-me">
              {user.displayName} · {userRoleLabel(user.role)}
            </Link>
            <span className="sb-item">
              {user.spaceIds.length} {T.yourSpaces}
            </span>
            <span className="grow" />
            <Link href="/notifications" className="sb-item">
              {T.notificationCenter}: {unread} {T.unread.toLowerCase()}
            </Link>
            <LogoutButton />
          </footer>
        </div>
        <CommandPalette role={user.role} />
        {/* One listener, every form: the browser refuses in Vietnamese now. */}
        <ValidationMessages />
      </body>
    </html>
  );
}
