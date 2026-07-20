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

export const metadata: Metadata = {
  title: "WisdomTree",
  description: "Nền tảng lưu trữ và tri thức của nhóm",
};

// Stamps the persisted (or OS-preferred) theme on <html> before first paint
// so the dark theme never flashes light.
const themeScript = `try{var t=localStorage.getItem("wt-theme");if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  if (!user) {
    return (
      <html lang="vi" suppressHydrationWarning>
        <body>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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

  const principal = { userId: user.id, role: user.role, spaceIds: user.spaceIds };
  const [unread, outline, recent, reviewTasks] = await Promise.all([
    unreadCount(principal),
    treeOutline(principal),
    recentNodes(principal, 6),
    user.role === "admin_op" ? listReviewQueue(principal, {}) : Promise.resolve([]),
  ]);
  const reviewOpen = reviewTasks.filter((t) =>
    ["queued", "assigned", "in_review", "changes_requested"].includes(t.state),
  ).length;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="shell">
          <ShellRail
            role={user.role}
            displayName={user.displayName}
            unread={unread}
            reviewOpen={reviewOpen}
          />
          <ShellSidebar
            branches={outline}
            recent={recent.map((n) => ({ id: n.id, title: n.title, branchName: n.branchName }))}
            role={user.role}
            spaceCount={user.spaceIds.length}
          />
          <div className="main-area">{children}</div>
          <footer className="statusbar">
            <span className="sb-item">
              {user.displayName} · {userRoleLabel(user.role)}
            </span>
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
      </body>
    </html>
  );
}
