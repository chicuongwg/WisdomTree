import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listLibrary } from "@/modules/storage/service";
import { myAssignedTasks } from "@/modules/storage/curation";
import { myTickets } from "@/modules/circulation/service";
import { listNotificationsWithLinks } from "@/modules/notify/service";
import { NotificationLink } from "@/app/components/notification-actions";
import { Empty } from "@/app/components/empty";
import {
  badgeClass,
  curationLabel,
  curationStateLabel,
  eventLabel,
  extractionLabel,
  extractionStateLabel,
  loanLabel,
  loanStateLabel,
  T,
  when,
} from "@/lib/vi";

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
            // TODO(vi): move to src/lib/vi.ts
            <Empty
              panel={false}
              title="Bạn chưa mượn cuốn sách nào."
              hint="Tìm sách trong thư viện rồi gửi yêu cầu mượn; thủ thư sẽ duyệt giúp bạn."
              action={{ label: T.catalog, href: "/catalog" }}
            />
          )}
          <ul>
            {tickets.slice(0, 5).map(({ ticket, itemTitle }) => (
              <li key={ticket.id}>
                <Link href={`/catalog/${ticket.itemId}`}>{itemTitle}</Link>{" "}
                <span className={badgeClass(loanStateLabel, ticket.state)}>
                  {loanLabel(ticket.state)}
                </span>
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
                  <span className={badgeClass(curationStateLabel, a.curation.state)}>
                    {curationLabel(a.curation.state)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="panel">
          <h2>
            <Link href="/notifications">{T.notifications}</Link>
          </h2>
          {notes.length === 0 && (
            // Nothing to press here: notifications arrive on their own.
            // TODO(vi): move to src/lib/vi.ts
            <Empty
              panel={false}
              title="Chưa có thông báo nào."
              hint="Khi có người nhắc bạn trong thảo luận, hoặc tư liệu bạn gửi có thay đổi, thông báo sẽ hiện ở đây."
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
