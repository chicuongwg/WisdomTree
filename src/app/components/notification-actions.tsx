"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markRead() {
    setBusy(true);
    await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="secondary" onClick={markRead} disabled={busy}>
      {busy ? T.loading : T.markRead}
    </button>
  );
}

/**
 * The "jump to" link on a notification row. It is a REAL anchor — middle
 * click, keyboard, and copy-link all behave — and reading it also marks the
 * notification read on the way out. `keepalive` lets that POST survive the
 * navigation; the explicit "Đánh dấu đã đọc" button stays on the row for
 * anyone who wants to clear a notification without opening it.
 */
export function NotificationLink({
  notificationId,
  href,
  children,
  unread,
}: {
  notificationId: string;
  href: string;
  children: React.ReactNode;
  unread: boolean;
}) {
  return (
    <Link
      href={href}
      className="notification-link"
      onClick={() => {
        if (!unread) return;
        void fetch(`/api/notifications/${notificationId}/read`, {
          method: "POST",
          keepalive: true,
        });
      }}
    >
      {children}
    </Link>
  );
}
