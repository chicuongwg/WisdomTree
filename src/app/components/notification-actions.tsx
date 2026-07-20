"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const m = useMutation();
  return (
    <>
      <SayMutation m={m} />
      <button
        className="secondary"
        onClick={() => void m.run(`/api/notifications/${notificationId}/read`)}
        disabled={m.busy}
      >
        {m.busy ? T.loading : T.markRead}
      </button>
    </>
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
  const router = useRouter();
  return (
    <Link
      href={href}
      className="notification-link"
      onClick={() => {
        if (!unread) return;
        // ponytail: the screen is already leaving, so a failed mark-read has
        // nowhere to render a message. Refreshing puts the unread row and its
        // badge back instead of leaving a silent, stale "đã đọc" behind.
        fetch(`/api/notifications/${notificationId}/read`, { method: "POST", keepalive: true })
          .then((res) => {
            if (!res.ok) router.refresh();
          })
          .catch(() => router.refresh());
      }}
    >
      {children}
    </Link>
  );
}
