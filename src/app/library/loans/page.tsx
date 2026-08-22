import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listTickets } from "@/modules/circulation/service";
import { badgeClass, day, loanLabel, loanStateLabel, T } from "@/lib/vi";
import { LoanActions } from "@/app/components/loan-actions";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.librarianDesk };

// Screen: Loan desk (`/library/loans`) — the Library's circulation queue.
// UI hiding is convenience only; the service layer enforces
// circulation.loan.manage regardless.
export default async function LoanDeskPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") {
    return (
      <main className="page">
        <h1>{T.librarianDesk}</h1>
        <Empty
          title={T.accessDenied}
          hint={T.accessDeniedHint}
          action={{ label: T.library, href: "/library" }}
        />
      </main>
    );
  }

  const tickets = await listTickets(toPrincipal(user));
  const groups = [
    { title: T.loanGroupRequested, states: ["requested"] },
    { title: T.loanGroupApproved, states: ["approved"] },
    { title: T.loanGroupBorrowed, states: ["borrowed", "overdue"] },
    { title: T.loanGroupDone, states: ["returned", "declined"] },
  ] as const;

  return (
    <main className="page">
      <h1>{T.librarianDesk}</h1>
      <p className="muted">
        <Link href="/library">{T.backToLibrary}</Link>
      </p>
      {groups.map((group) => {
        const rows = tickets.filter((t) =>
          (group.states as readonly string[]).includes(t.ticket.state),
        );
        return (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {rows.length === 0 ? (
              <Empty title={T.deskTicketsEmptyTitle} hint={T.deskTicketsEmptyHint} />
            ) : (
              <div className="record-scroll">
                <table className="list">
                  <thead>
                    <tr>
                      <th scope="col">{T.catalogItem}</th>
                      <th scope="col">{T.borrower}</th>
                      <th scope="col">{T.state}</th>
                      <th scope="col">{T.dueDate}</th>
                      <th scope="col">
                        <span className="muted">{T.actionsColumn}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ ticket, sourceId, itemTitle, itemCode, borrowerName }) => (
                      <tr key={ticket.id}>
                        <td>
                          <Link href={`/library/${sourceId}`}>{itemTitle}</Link>{" "}
                          <span className="muted">({itemCode})</span>
                        </td>
                        <td>{borrowerName}</td>
                        <td>
                          <span className={badgeClass(loanStateLabel, ticket.state)}>
                            {loanLabel(ticket.state)}
                          </span>
                        </td>
                        <td>{day(ticket.dueAt)}</td>
                        <td>
                          <LoanActions ticketId={ticket.id} state={ticket.state} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
