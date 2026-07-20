import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/modules/notify/schema";
import { requireUser, toPrincipal } from "@/lib/page";
import { listLibrary } from "@/modules/storage/service";
import { myAssignedTasks } from "@/modules/storage/curation";
import { myTickets } from "@/modules/circulation/service";
import {
  curationStateLabel,
  extractionLabel,
  loanStateLabel,
  notificationEventLabel,
  T,
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
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(5),
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
                <span className="badge muted">{extractionLabel[item.extractionStatus]}</span>
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
                <span className="badge muted">{loanStateLabel[ticket.state]}</span>
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
                  <span className="badge muted">{curationStateLabel[a.curation.state]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="panel">
          <h2>{T.notifications}</h2>
          {notes.length === 0 && <p className="muted">{T.empty}</p>}
          <ul>
            {notes.map((n) => (
              <li key={n.id}>
                <Link href="/notifications">
                  {notificationEventLabel[n.eventType] ?? n.eventType}
                </Link>
                <span className="meta">{n.createdAt.toLocaleString("vi-VN")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
