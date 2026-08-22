import type { ItemLoanRecord } from "@/modules/circulation/service";
import { badgeClass, day, loanLabel, loanStateLabel, T, when } from "@/lib/vi";

// The loan REGISTER for one Library item — not a discussion: who is holding
// the book, when they asked, who approved it, when it goes back. Several
// copies means several loans running at once, so every active one shows.

const ACTIVE_STATES = new Set(["requested", "approved", "borrowed", "overdue"]);

/** Overdue = the state says so, or the book is out and the due date passed. */
const isOverdue = (t: ItemLoanRecord["ticket"]): boolean =>
  t.state === "overdue" ||
  (t.state === "borrowed" && t.dueAt !== null && t.dueAt.getTime() < Date.now());

function StateBadge({ ticket }: { ticket: ItemLoanRecord["ticket"] }) {
  const overdue = isOverdue(ticket);
  // Colour never carries the meaning on its own: the badge prints the state
  // in words, and an overdue loan says "Quá hạn" outright.
  return (
    <span className={badgeClass(loanStateLabel, overdue ? "overdue" : ticket.state)}>
      {overdue ? T.overdueLabel : loanLabel(ticket.state)}
    </span>
  );
}

export function LoanRecord({ title, tickets }: { title: string; tickets: ItemLoanRecord[] }) {
  const active = tickets.filter((t) => ACTIVE_STATES.has(t.ticket.state));
  const past = tickets.filter((t) => !ACTIVE_STATES.has(t.ticket.state));

  return (
    <section className="panel" aria-labelledby="loan-record-heading">
      <h2 id="loan-record-heading">{T.loanRecord}</h2>

      <h3>{T.currentLoan}</h3>
      {active.length > 0 ? (
        active.map((row) => (
          <dl key={row.ticket.id} className="record">
            <dt>{T.state}</dt>
            <dd>
              <StateBadge ticket={row.ticket} />
              {isOverdue(row.ticket) && (
                <>
                  {" "}
                  <span className="overdue-note">
                    {T.overdueLabel} · {T.dueDate} {day(row.ticket.dueAt)}
                  </span>
                </>
              )}
            </dd>
            <dt>{T.borrower}</dt>
            <dd>{row.borrowerName}</dd>
            <dt>{T.requestedAtLabel}</dt>
            <dd>{when(row.ticket.requestedAt)}</dd>
            <dt>{T.approvedByLabel}</dt>
            <dd>
              {row.handlerName ?? T.notYet}
              {row.ticket.approvedAt && (
                <span className="muted">
                  {" · "}
                  {T.approvedAtLabel} {when(row.ticket.approvedAt)}
                </span>
              )}
            </dd>
            <dt>{T.borrowedAtLabel}</dt>
            <dd>{row.ticket.borrowedAt ? when(row.ticket.borrowedAt) : T.notYet}</dd>
            <dt>{T.dueDate}</dt>
            <dd>{row.ticket.dueAt ? day(row.ticket.dueAt) : T.notYet}</dd>
            {row.ticket.returnedAt && (
              <>
                <dt>{T.returnedAtLabel}</dt>
                <dd>{when(row.ticket.returnedAt)}</dd>
              </>
            )}
          </dl>
        ))
      ) : (
        <p className="muted">{tickets.length === 0 ? T.noLoanRecord : T.noCurrentLoan}</p>
      )}

      {past.length > 0 && (
        <>
          <h3>{T.loanHistory}</h3>
          <div className="record-scroll">
            <table className="list">
              <caption className="sr-only">
                {T.loanHistory} — {title}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{T.state}</th>
                  <th scope="col">{T.borrower}</th>
                  <th scope="col">{T.requestedAtLabel}</th>
                  <th scope="col">{T.approvedByLabel}</th>
                  <th scope="col">{T.borrowedAtLabel}</th>
                  <th scope="col">{T.dueDate}</th>
                  <th scope="col">{T.returnedAtLabel}</th>
                </tr>
              </thead>
              <tbody>
                {past.map((row) => (
                  <tr key={row.ticket.id}>
                    <td>
                      <StateBadge ticket={row.ticket} />
                    </td>
                    <td>{row.borrowerName}</td>
                    <td>{when(row.ticket.requestedAt)}</td>
                    <td>{row.handlerName ?? "—"}</td>
                    <td>{when(row.ticket.borrowedAt)}</td>
                    <td>{day(row.ticket.dueAt)}</td>
                    <td>{when(row.ticket.returnedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
