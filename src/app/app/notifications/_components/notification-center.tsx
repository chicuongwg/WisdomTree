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
    return (
      <p className="ui-next-notification-empty m-0 text-ui-text-secondary">
        {translate(locale, "notifications.empty")}
      </p>
    );
  }

  return (
    <div className="ui-next-notification-center grid gap-3">
      {truncated ? (
        <p className="m-0 text-sm text-ui-text-secondary">
          {translate(locale, "notifications.truncated")}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm text-ui-danger">
          {error}
        </p>
      ) : null}
      <ul className="ui-next-notification-list m-0 p-0 list-none divide-y divide-ui-border border-t border-ui-border">
        {notifications.map((notification) => {
          const unread = !notification.readAt;
          const content = (
            <>
              <strong className="text-ui-text break-words font-semibold">
                {notification.eventType === "comment.created"
                  ? translate(locale, "notifications.mention")
                  : (notification.link?.label ?? eventLabel(notification.eventType))}
              </strong>
              {notification.link?.subject ? (
                <span className="text-ui-text-secondary text-sm break-words">
                  {notification.link.subject}
                </span>
              ) : null}
              <small className="text-xs text-ui-text-muted">
                {formatUiDate(notification.createdAt, locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </small>
            </>
          );
          return (
            <li
              key={notification.id}
              data-unread={unread || undefined}
              className={`flex items-center max-sm:items-stretch max-sm:flex-col justify-between gap-4 py-3 px-4 border-b border-ui-border transition-colors ${
                unread ? "border-l-[0.3rem] border-l-ui-accent bg-ui-surface-sunken/40" : ""
              }`}
            >
              {notification.link ? (
                <Link
                  href={notification.link.href}
                  className="min-w-0 grid gap-1 text-ui-text no-underline hover:text-ui-accent"
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
                <div className="min-w-0 grid gap-1 text-ui-text">
                  {content}
                  <small className="text-xs text-ui-text-muted">
                    {translate(locale, "notifications.unavailable")}
                  </small>
                </div>
              )}
              <div className="ui-next-notification-list__state grid justify-items-end max-sm:justify-items-start gap-1 shrink-0 text-ui-text-secondary text-sm">
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
