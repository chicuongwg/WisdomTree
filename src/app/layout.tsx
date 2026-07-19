import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/modules/auth/session";
import { unreadCount } from "@/modules/notify/service";
import { T, roleLabel } from "@/lib/vi";
import { LogoutButton } from "./components/logout-button";

export const metadata: Metadata = {
  title: "WisdomTree",
  description: "Nền tảng lưu trữ và tri thức của nhóm",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const unread = user
    ? await unreadCount({ userId: user.id, role: user.role, spaceIds: user.spaceIds })
    : 0;
  return (
    <html lang="vi">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            {T.appName}
          </Link>
          {user && (
            <nav>
              <Link href="/tree">{T.tree}</Link>
              <Link href="/library">{T.library}</Link>
              <Link href="/source/intake">{T.sourceIntake}</Link>
              <Link href="/source/mine">{T.mySubmissions}</Link>
              <Link href="/catalog">{T.catalog}</Link>
              <Link href="/deadlines">{T.deadline}</Link>
              {(user.role === "editor" || user.role === "admin_op") && (
                <Link href="/board">{T.board}</Link>
              )}
              {user.role === "admin_op" && (
                <>
                  <Link href="/source/inbox">{T.sourceInbox}</Link>
                  <Link href="/review">{T.reviewQueue}</Link>
                  <Link href="/catalog/admin">{T.librarianDesk}</Link>
                </>
              )}
            </nav>
          )}
          {user && (
            <div className="who">
              <Link
                href="/notifications"
                className="bell"
                aria-label={`${T.notificationCenter}${unread > 0 ? ` (${unread} ${T.unread.toLowerCase()})` : ""}`}
              >
                {T.notificationCenter}
                {unread > 0 && <span className="count">{unread}</span>}
              </Link>
              <span>
                {user.displayName} · {roleLabel[user.role]}
              </span>
              <LogoutButton />
            </div>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
