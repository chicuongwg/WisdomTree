import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getCatalogItem } from "@/modules/catalog/service";
import { listTicketsForItem, type ItemLoanRecord } from "@/modules/circulation/service";
import {
  badgeClass,
  day,
  itemLabel,
  itemStatusLabel,
  loanLabel,
  loanStateLabel,
  T,
  when,
} from "@/lib/vi";
import { LoanRequestButton } from "@/app/components/loan-request-button";
import { CatalogArchiveButton, CatalogCopiesForm } from "@/app/components/catalog-copies-form";

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

/** Overdue = the state says so, or the book is out and the due date has passed. */
const isOverdue = (t: ItemLoanRecord["ticket"]): boolean =>
  t.state === "overdue" ||
  (t.state === "borrowed" && t.dueAt !== null && t.dueAt.getTime() < Date.now());

function StateBadge({ ticket }: { ticket: ItemLoanRecord["ticket"] }) {
  const overdue = isOverdue(ticket);
  // Colour never carries the meaning on its own: the badge prints the state in
  // words, and an overdue loan says "Quá hạn" outright. A loan that is overdue
  // by the due date rather than by its stored state is toned as `overdue` too,
  // so the chip and the word always agree.
  return (
    <span className={badgeClass(loanStateLabel, overdue ? "overdue" : ticket.state)}>
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
  // Several copies means several loans running at once, so the register shows
  // every one of them. Picking the first and filing the rest under "các lượt
  // mượn trước" would print a book that is still out as already returned.
  const active = tickets.filter((t) => ACTIVE_STATES.has(t.ticket.state));
  const past = tickets.filter((t) => !ACTIVE_STATES.has(t.ticket.state));

  return (
    <main className="page">
      <h1>{item.title}</h1>
      <div className="panel">
        <div className="record-scroll">
          <table className="list">
            <tbody>
              <tr>
                <th scope="row">Mã số</th>
                <td>{item.itemCode}</td>
              </tr>
              <tr>
                <th scope="row">Tác giả</th>
                <td>{item.author}</td>
              </tr>
              <tr>
                <th scope="row">Vị trí</th>
                <td>{item.location}</td>
              </tr>
              <tr>
                <th scope="row">Trạng thái</th>
                <td>
                  <span className={badgeClass(itemStatusLabel, item.status)}>
                    {itemLabel(item.status)}
                  </span>
                </td>
              </tr>
              <tr>
                <th scope="row">{T.copiesTotal}</th>
                <td>{item.copies}</td>
              </tr>
              <tr>
                <th scope="row">{T.copiesAvailable}</th>
                {/* In words and in numbers both: a reader must not have to
                    infer "hết sách" from a badge colour. */}
                <td>
                  {item.availableCopies === 0
                    ? T.copiesAllOut
                    : T.copiesOf(item.availableCopies, item.copies)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* A borrowable title is one with a copy left — not one with no ticket
            against it. The old test (`activeLoan` is null) turned the second
            borrower away from a shelf holding two more books. */}
        <LoanRequestButton
          itemId={item.id}
          disabled={item.status === "lost" || item.status === "repair" || item.availableCopies === 0}
        />
        {user.role === "admin_op" && (
          <>
            <CatalogCopiesForm itemId={item.id} copies={item.copies} />
            <CatalogArchiveButton itemId={item.id} />
          </>
        )}
      </div>

      <section className="panel" aria-labelledby="loan-record-heading">
        <h2 id="loan-record-heading">{T.loanRecord}</h2>

        <h3>{T.currentLoan}</h3>
        {active.length > 0 ? (
          active.map((active) => (
          <dl key={active.ticket.id} className="record">
            <dt>{T.state}</dt>
            <dd>
              <StateBadge ticket={active.ticket} />
              {isOverdue(active.ticket) && (
                <>
                  {" "}
                  <span className="overdue-note">
                    {T.overdueLabel} · {T.dueDate} {day(active.ticket.dueAt)}
                  </span>
                </>
              )}
            </dd>
            <dt>{T.borrower}</dt>
            <dd>{active.borrowerName}</dd>
            <dt>{T.requestedAtLabel}</dt>
            <dd>{when(active.ticket.requestedAt)}</dd>
            <dt>{T.approvedByLabel}</dt>
            <dd>
              {active.handlerName ?? T.notYet}
              {active.ticket.approvedAt && (
                <span className="muted">
                  {" · "}
                  {T.approvedAtLabel} {when(active.ticket.approvedAt)}
                </span>
              )}
            </dd>
            <dt>{T.borrowedAtLabel}</dt>
            <dd>{active.ticket.borrowedAt ? when(active.ticket.borrowedAt) : T.notYet}</dd>
            <dt>{T.dueDate}</dt>
            <dd>{active.ticket.dueAt ? day(active.ticket.dueAt) : T.notYet}</dd>
            {active.ticket.returnedAt && (
              <>
                <dt>{T.returnedAtLabel}</dt>
                <dd>{when(active.ticket.returnedAt)}</dd>
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
    </main>
  );
}
