import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getCatalogItem } from "@/modules/catalog/service";
import { listTicketsForItem, type ItemLoanRecord } from "@/modules/circulation/service";
import { itemLabel, loanLabel, T } from "@/lib/vi";
import { LoanRequestButton } from "@/app/components/loan-request-button";

// Screen: Catalog Item Detail (`/catalog/:id`) — member view with loan request
// and the loan record.
//
// There is no comment block here. Owner decision 2026-07-20: a loan is a
// register entry, not a discussion — who is holding the book, when they asked,
// who approved it, when it goes back. The block below answers "ai đang giữ
// cuốn này và ai đã duyệt" on this screen, so a librarian never opens a second
// one. The anchor is gone from the contract and the database too, not merely
// hidden here (drizzle/0002_comments_drop_loan_anchor.sql).

const ACTIVE_STATES = new Set(["requested", "approved", "borrowed", "overdue"]);

const dateTime = (d: Date | null | undefined): string =>
  d ? d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";
const date = (d: Date | null | undefined): string => (d ? d.toLocaleDateString("vi-VN") : "—");

/** Overdue = the state says so, or the book is out and the due date has passed. */
const isOverdue = (t: ItemLoanRecord["ticket"]): boolean =>
  t.state === "overdue" ||
  (t.state === "borrowed" && t.dueAt !== null && t.dueAt.getTime() < Date.now());

function StateBadge({ ticket }: { ticket: ItemLoanRecord["ticket"] }) {
  const overdue = isOverdue(ticket);
  // Colour never carries the meaning on its own: the badge prints the state in
  // words, and an overdue loan says "Quá hạn" outright.
  return (
    <span className={`badge ${overdue ? "danger" : ticket.state === "returned" ? "muted" : ""}`}>
      {overdue ? T.overdueLabel : loanLabel(ticket.state)}
    </span>
  );
}

export default async function CatalogItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const actor = toPrincipal(user);
  const item = await orNotFound(() => getCatalogItem(actor, id));
  // Same read authorization as the item itself; the page never queries the db.
  const tickets = await listTicketsForItem(actor, item.id);
  const active = tickets.find((t) => ACTIVE_STATES.has(t.ticket.state)) ?? null;
  const past = tickets.filter((t) => t !== active);

  return (
    <main className="page">
      <h1>{item.title}</h1>
      <div className="panel">
        <table className="list">
          <tbody>
            <tr>
              <th>Mã số</th>
              <td>{item.itemCode}</td>
            </tr>
            <tr>
              <th>Tác giả</th>
              <td>{item.author}</td>
            </tr>
            <tr>
              <th>Vị trí</th>
              <td>{item.location}</td>
            </tr>
            <tr>
              <th>Trạng thái</th>
              <td>
                <span className={`badge ${item.status === "available" ? "" : "warn"}`}>
                  {itemLabel(item.status)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <LoanRequestButton
          itemId={item.id}
          disabled={item.status !== "available" || Boolean(item.activeLoan)}
        />
      </div>

      <section className="panel" aria-labelledby="loan-record-heading">
        <h2 id="loan-record-heading">{T.loanRecord}</h2>

        <h3>{T.currentLoan}</h3>
        {active ? (
          <dl className="record">
            <dt>{T.state}</dt>
            <dd>
              <StateBadge ticket={active.ticket} />
              {isOverdue(active.ticket) && (
                <>
                  {" "}
                  <span className="overdue-note">
                    {T.overdueLabel} · {T.dueDate} {date(active.ticket.dueAt)}
                  </span>
                </>
              )}
            </dd>
            <dt>{T.borrower}</dt>
            <dd>{active.borrowerName}</dd>
            <dt>{T.requestedAtLabel}</dt>
            <dd>{dateTime(active.ticket.requestedAt)}</dd>
            <dt>{T.approvedByLabel}</dt>
            <dd>
              {active.handlerName ?? T.notYet}
              {active.ticket.approvedAt && (
                <span className="muted">
                  {" · "}
                  {T.approvedAtLabel} {dateTime(active.ticket.approvedAt)}
                </span>
              )}
            </dd>
            <dt>{T.borrowedAtLabel}</dt>
            <dd>{active.ticket.borrowedAt ? dateTime(active.ticket.borrowedAt) : T.notYet}</dd>
            <dt>{T.dueDate}</dt>
            <dd>{active.ticket.dueAt ? date(active.ticket.dueAt) : T.notYet}</dd>
            {active.ticket.returnedAt && (
              <>
                <dt>{T.returnedAtLabel}</dt>
                <dd>{dateTime(active.ticket.returnedAt)}</dd>
              </>
            )}
          </dl>
        ) : (
          <p className="muted">{tickets.length === 0 ? T.noLoanRecord : T.noCurrentLoan}</p>
        )}

        {past.length > 0 && (
          <>
            <h3>{T.loanHistory}</h3>
            <div className="record-scroll">
              <table className="list">
                <caption className="sr-only">
                  {T.loanHistory} — {item.title}
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
                      <td>{dateTime(row.ticket.requestedAt)}</td>
                      <td>{row.handlerName ?? "—"}</td>
                      <td>{dateTime(row.ticket.borrowedAt)}</td>
                      <td>{date(row.ticket.dueAt)}</td>
                      <td>{dateTime(row.ticket.returnedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
