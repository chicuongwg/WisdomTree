import { requireUser, toPrincipal } from "@/lib/page";
import { listTickets } from "@/modules/circulation/service";
import { loanLabel, T } from "@/lib/vi";
import { LoanActions } from "@/app/components/loan-actions";

// Screen: Librarian Desk (`/catalog/admin`) — Admin/Op circulation surface.
// UI hiding is convenience only; the service layer enforces
// circulation.loan.manage regardless (authorization-design.md).
export default async function LibrarianDeskPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") {
    return (
      <main className="page">
        <h1>{T.librarianDesk}</h1>
        <p className="error-text">{T.accessDenied}</p>
      </main>
    );
  }

  const tickets = await listTickets(toPrincipal(user));
  const groups = [
    { title: "Chờ duyệt", states: ["requested"] },
    { title: "Chờ giao sách", states: ["approved"] },
    { title: "Đang mượn", states: ["borrowed", "overdue"] },
    { title: "Đã xong", states: ["returned", "declined"] },
  ] as const;

  return (
    <main className="page">
      <h1>{T.librarianDesk}</h1>
      {groups.map((group) => {
        const rows = tickets.filter((t) => (group.states as readonly string[]).includes(t.ticket.state));
        return (
          <section key={group.title}>
            <h2>{group.title}</h2>
            {rows.length === 0 ? (
              <p className="muted">{T.empty}</p>
            ) : (
              <table className="list">
                <thead>
                  <tr>
                    <th>{T.catalogItem}</th>
                    <th>Người mượn</th>
                    <th>Trạng thái</th>
                    <th>{T.dueDate}</th>
                    <th></th>
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
                        <span className={`badge ${ticket.state === "overdue" ? "danger" : "muted"}`}>
                          {loanLabel(ticket.state)}
                        </span>
                      </td>
                      <td>{ticket.dueAt ? ticket.dueAt.toLocaleDateString("vi-VN") : "—"}</td>
                      <td>
                        <LoanActions ticketId={ticket.id} state={ticket.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </main>
  );
}
