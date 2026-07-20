import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listLibrary } from "@/modules/storage/service";
import { myAssignedTasks } from "@/modules/storage/curation";
import { myTickets } from "@/modules/circulation/service";
import { listNotificationsWithLinks } from "@/modules/notify/service";
import { NotificationLink } from "@/app/components/notification-actions";
import { curationLabel, eventLabel, extractionStateLabel, loanLabel, T } from "@/lib/vi";

// Screen: Home (`/` — screen-inventory.md)
export default async function Home() {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const [recent, tickets, assigned, notes] = await Promise.all([
    listLibrary(actor, {}),
    myTickets(actor),
    user.role === "editor" || user.role === "admin_op"
      ? myAssignedTasks(actor)
      : Promise.resolve([]),
    listNotificationsWithLinks(actor, 5),
  ]);

  return (
    <main className="page">
      <h1>Chào {user.displayName}!</h1>
      <div className="cards">
        <div className="panel">
          <h2>
            <Link href="/library">{T.library}</Link>
          </h2>
          {recent.length === 0 && <p className="muted">{T.empty}</p>}
          <ul>
            {recent.slice(0, 5).map((item) => (
              <li key={item.sourceId}>
                <Link href={`/library/${item.sourceId}`}>{item.title}</Link>{" "}
                <span className="badge muted">{extractionStateLabel(item.extractionStatus)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>{T.loanTicket}</h2>
          {tickets.length === 0 && <p className="muted">{T.empty}</p>}
          <ul>
            {tickets.slice(0, 5).map(({ ticket, itemTitle }) => (
              <li key={ticket.id}>
                <Link href={`/catalog/${ticket.itemId}`}>{itemTitle}</Link>{" "}
                <span className="badge muted">{loanLabel(ticket.state)}</span>
              </li>
            ))}
          </ul>
        </div>
        {assigned.length > 0 && (
          <div className="panel">
            <h2>{T.assignedTask}</h2>
            <ul>
              {assigned.slice(0, 5).map((a) => (
                <li key={a.curation.id}>
                  <Link href={`/source/task/${a.sourceId}`}>{a.title}</Link>{" "}
                  <span className="badge muted">{curationLabel(a.curation.state)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="panel">
          <h2>
            <Link href="/notifications">{T.notifications}</Link>
          </h2>
          {notes.length === 0 && <p className="muted">{T.empty}</p>}
          <ul>
            {notes.map((n) => (
              <li key={n.id} className={n.readAt ? undefined : "notification-unread"}>
                {n.link ? (
                  <NotificationLink notificationId={n.id} href={n.link.href} unread={!n.readAt}>
                    {n.link.label}
                  </NotificationLink>
                ) : (
                  // Unmappable event: the sentence still reads, but nothing
                  // pretends to be clickable.
                  eventLabel(n.eventType)
                )}
                <span className="meta">{n.createdAt.toLocaleString("vi-VN")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
