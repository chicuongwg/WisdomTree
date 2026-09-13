"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { eventLabel } from "@/lib/vi";
import { Button, formatUiDate, translate } from "@/app/components/ui-next";

type Notification = {
  id: string;
  eventType: string;
  createdAt: Date | string;
  readAt: Date | string | null;
  link: { href: string; label: string; subject?: string } | null;
};

export function NotificationCenter({
  locale,
  notifications,
  truncated,
}: {
  locale: UiLocale;
  notifications: Notification[];
  truncated: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markRead(notificationId: string) {
    setBusy(notificationId);
    setError(null);
    try {
      const response = await fetch(
        `/api/app/notifications/${encodeURIComponent(notificationId)}/read`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("mark_read_failed");
      router.refresh();
    } catch {
      setError(translate(locale, "notifications.markReadFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (!notifications.length) {
    return <p className="ui-next-notification-empty">{translate(locale, "notifications.empty")}</p>;
  }

  return (
    <div className="ui-next-notification-center">
      {truncated ? <p>{translate(locale, "notifications.truncated")}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <ul className="ui-next-notification-list">
        {notifications.map((notification) => {
          const unread = !notification.readAt;
          const content = (
            <>
              <strong>
                {notification.eventType === "comment.created"
                  ? translate(locale, "notifications.mention")
                  : (notification.link?.label ?? eventLabel(notification.eventType))}
              </strong>
              {notification.link?.subject ? <span>{notification.link.subject}</span> : null}
              <small>
                {formatUiDate(notification.createdAt, locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </small>
            </>
          );
          return (
            <li key={notification.id} data-unread={unread || undefined}>
              {notification.link ? (
                <Link
                  href={notification.link.href}
                  onClick={() => {
                    if (!unread) return;
                    void fetch(
                      `/api/app/notifications/${encodeURIComponent(notification.id)}/read`,
                      {
                        method: "POST",
                        keepalive: true,
                      },
                    ).finally(() => router.refresh());
                  }}
                >
                  {content}
                  {unread ? (
                    <span className="ui-next-visually-hidden">
                      {translate(locale, "notifications.unread")}
                    </span>
                  ) : null}
                </Link>
              ) : (
                <div>
                  {content}
                  <small>{translate(locale, "notifications.unavailable")}</small>
                </div>
              )}
              <div className="ui-next-notification-list__state">
                <span>
                  {translate(locale, unread ? "notifications.unread" : "notifications.read")}
                </span>
                {unread ? (
                  <Button
                    type="button"
                    variant="ghost"
                    loading={busy === notification.id}
                    loadingLabel={translate(locale, "common.loading")}
                    onClick={() => void markRead(notification.id)}
                  >
                    {translate(locale, "notifications.markRead")}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
