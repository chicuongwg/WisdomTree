import { requireUser, toPrincipal } from "@/lib/page";
import { getPreferences, listNotificationsWithLinks } from "@/modules/notify/service";
import { eventLabel, T, when } from "@/lib/vi";
import { MarkReadButton, NotificationLink } from "@/app/components/notification-actions";
import { NotificationPrefsForm } from "@/app/components/notification-prefs";
import { Empty } from "@/app/components/empty";

// Screen: Notification Center (`/notifications`) — the in-app channel of
// docs/system/notifications.md plus the per-event channel preferences.
// Every row that CAN be opened is a link to the object it is about
// (modules/notify/links.ts); an event we cannot map stays plain text rather
// than becoming a dead link.
export default async function NotificationsPage() {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const [notes, prefs] = await Promise.all([
    listNotificationsWithLinks(actor),
    getPreferences(actor),
  ]);

  return (
    <main className="page">
      <h1>{T.notificationCenter}</h1>
      <div className="panel">
        {notes.length === 0 ? (
          // Nothing to press: notifications arrive on their own, and the
          // channel settings are already on this page just below.
          <Empty
            panel={false}
            title={T.notificationsEmptyTitle}
            hint={T.notificationsEmptyHint}
          />
        ) : (
          <div className="record-scroll">
            <table className="list">
              <thead>
                <tr>
                  <th scope="col">Nội dung</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col">{T.state}</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((n) => {
                  const payload = (n.payload ?? {}) as Record<string, unknown>;
                  const subject = typeof payload.title === "string" ? payload.title : null;
                  // The link text carries the whole sentence + subject, so it
                  // still says what it opens when read out of context.
                  const text = (
                    <>
                      {eventLabel(n.eventType)}
                      {subject && <span className="muted"> — {subject}</span>}
                    </>
                  );
                  return (
                    <tr key={n.id} className={n.readAt ? undefined : "notification-unread"}>
                      <td>
                        {n.link ? (
                          <NotificationLink
                            notificationId={n.id}
                            href={n.link.href}
                            unread={!n.readAt}
                          >
                            {text}
                          </NotificationLink>
                        ) : (
                          text
                        )}
                      </td>
                      <td className="muted">{when(n.createdAt)}</td>
                      <td>
                        {n.readAt ? (
                          <span className="badge muted">Đã đọc</span>
                        ) : (
                          <MarkReadButton notificationId={n.id} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h2>{T.notificationPrefs}</h2>
      <div className="panel">
        <NotificationPrefsForm initial={prefs} />
      </div>
    </main>
  );
}
