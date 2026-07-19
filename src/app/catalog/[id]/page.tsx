import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getCatalogItem } from "@/modules/catalog/service";
import { itemStatusLabel, loanStateLabel, T } from "@/lib/vi";
import { LoanRequestButton } from "@/app/components/loan-request-button";

// Screen: Catalog Item Detail (`/catalog/:id`) — member view with loan request.
export default async function CatalogItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await orNotFound(() => getCatalogItem(toPrincipal(user), id));

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
                  {itemStatusLabel[item.status]}
                </span>
              </td>
            </tr>
            {item.activeLoan && (
              <tr>
                <th>{T.loanTicket}</th>
                <td>
                  <span className="badge muted">{loanStateLabel[item.activeLoan.state]}</span>
                  {item.activeLoan.dueAt && (
                    <span className="muted"> · {T.dueDate}: {item.activeLoan.dueAt.toLocaleDateString("vi-VN")}</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <LoanRequestButton
          itemId={item.id}
          disabled={item.status !== "available" || Boolean(item.activeLoan)}
        />
      </div>
    </main>
  );
}
