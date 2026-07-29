import { requireUser, toPrincipal } from "@/lib/page";
import { listTickets } from "@/modules/circulation/service";
import { listMemberSpaces } from "@/modules/storage/service";
import { badgeClass, day, loanLabel, loanStateLabel, T } from "@/lib/vi";
import { LoanActions } from "@/app/components/loan-actions";
import { CatalogItemForm } from "@/app/components/catalog-item-form";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.librarianDesk };

// Screen: Librarian Desk (`/catalog/admin`) — Admin/Op circulation surface.
// UI hiding is convenience only; the service layer enforces
// circulation.loan.manage regardless (authorization-design.md).
export default async function LibrarianDeskPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") {
    return (
      // Refused, with a way out. A red sentence on a page whose only other
      // element is its own title leaves the reader with the browser's back
      // button and no idea where they are allowed to be — shared-states.md
      // asks every dead end for a safe next step.
      <main className="page">
        <h1>{T.librarianDesk}</h1>
        <Empty
          title={T.accessDenied}
          hint={T.accessDeniedHint}
          action={{ label: T.catalog, href: "/catalog" }}
        />
      </main>
    );
  }

  const actor = toPrincipal(user);
  const [tickets, spaces] = await Promise.all([listTickets(actor), listMemberSpaces(actor)]);
  const groups = [
    { title: "Chờ duyệt", states: ["requested"] },
    { title: "Chờ giao sách", states: ["approved"] },
    { title: "Đang mượn", states: ["borrowed", "overdue"] },
    { title: "Đã xong", states: ["returned", "declined"] },
  ] as const;

  return (
    <main className="page">
      <h1>{T.librarianDesk}</h1>
      <section className="panel">
        <h2>{T.addCatalogItem}</h2>
        <CatalogItemForm spaces={spaces} />
      </section>
      {groups.map((group) => {
        const rows = tickets.filter((t) =>
          (group.states as readonly string[]).includes(t.ticket.state),
        );
        return (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {rows.length === 0 ? (
              // One copy for all four groups: a ticket lands here by moving
              // through the desk, not by anyone pressing something on this
              // screen.
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
                        <span className="muted">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ ticket, itemTitle, itemCode, borrowerName }) => (
                      <tr key={ticket.id}>
                        <td>
                          {itemTitle} <span className="muted">({itemCode})</span>
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
