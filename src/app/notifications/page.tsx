import { requireUser, toPrincipal } from "@/lib/page";
import { getPreferences, listNotifications } from "@/modules/notify/service";
import { notificationEventLabel, T } from "@/lib/vi";
import { MarkReadButton } from "@/app/components/notification-actions";
import { NotificationPrefsForm } from "@/app/components/notification-prefs";

// Screen: Notification Center (`/notifications`) — the in-app channel of
// docs/system/notifications.md plus the per-event channel preferences.
export default async function NotificationsPage() {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const [notes, prefs] = await Promise.all([listNotifications(actor), getPreferences(actor)]);

  return (
    <main className="page">
      <h1>{T.notificationCenter}</h1>
      <div className="panel">
        {notes.length === 0 ? (
          <p className="muted">Chưa có thông báo nào.</p>
        ) : (
          <table className="list">
            <thead>
              <tr>
                <th scope="col">Nội dung</th>
                <th scope="col">Thời gian</th>
                <th scope="col">{T.state}</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <tr key={n.id} className={n.readAt ? undefined : "notification-unread"}>
                  <td>
                    {notificationEventLabel[n.eventType] ?? n.eventType}
                    {typeof (n.payload as Record<string, unknown>).title === "string" && (
                      <span className="muted"> — {(n.payload as { title: string }).title}</span>
                    )}
                  </td>
                  <td className="muted">{n.createdAt.toLocaleString("vi-VN")}</td>
                  <td>
                    {n.readAt ? (
                      <span className="badge muted">Đã đọc</span>
                    ) : (
                      <MarkReadButton notificationId={n.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>{T.notificationPrefs}</h2>
      <div className="panel">
        <NotificationPrefsForm initial={prefs} />
      </div>
    </main>
  );
}
