import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listLibrary } from "@/modules/storage/service";
import { myTickets } from "@/modules/circulation/service";
import { listNotificationsWithLinks } from "@/modules/notify/service";
import { NotificationLink } from "@/app/components/notification-actions";
import { Empty } from "@/app/components/empty";
import {
  badgeClass,
  eventLabel,
  extractionLabel,
  extractionStateLabel,
  loanLabel,
  loanStateLabel,
  T,
  when,
} from "@/lib/vi";

// Screen: Home (`/`)
export default async function Home() {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const [recent, tickets, notes] = await Promise.all([
    listLibrary(actor, {}),
    myTickets(actor),
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
          {recent.length === 0 && (
            <Empty
              panel={false}
              title={T.libraryEmptyTitle}
              hint={T.libraryEmptyHint}
              action={{ label: T.uploadCta, href: "/source/intake" }}
            />
          )}
          <ul>
            {recent.slice(0, 5).map((item) => (
              <li key={item.sourceId}>
                <Link href={`/library/${item.sourceId}`}>{item.title}</Link>{" "}
                <span className={badgeClass(extractionLabel, item.extractionStatus)}>
                  {extractionStateLabel(item.extractionStatus)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>{T.loanTicket}</h2>
          {tickets.length === 0 && (
            <Empty
              panel={false}
              title={T.homeLoansEmptyTitle}
              hint={T.homeLoansEmptyHint}
              action={{ label: T.library, href: "/library" }}
            />
          )}
          <ul>
            {tickets.slice(0, 5).map(({ ticket, sourceId, itemTitle }) => (
              <li key={ticket.id}>
                <Link href={`/library/${sourceId}`}>{itemTitle}</Link>{" "}
                <span className={badgeClass(loanStateLabel, ticket.state)}>
                  {loanLabel(ticket.state)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>
            <Link href="/notifications">{T.notifications}</Link>
          </h2>
          {notes.length === 0 && (
            // Nothing to press here: notifications arrive on their own.
            <Empty
              panel={false}
              title={T.notificationsEmptyTitle}
              hint={T.homeNotificationsEmptyHint}
            />
          )}
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
                <span className="meta">{when(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
