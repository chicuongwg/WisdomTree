import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { mySubmissions } from "@/modules/storage/service";
import { gapLabel, T, trustStateLabel } from "@/lib/vi";

// Screen: My Submissions (`/source/mine`) — unified intake history over the
// intake_items view (sources + branch-gap requests).
export default async function MySubmissionsPage() {
  const user = await requireUser();
  const items = await mySubmissions(toPrincipal(user));

  return (
    <main className="page">
      <h1>{T.mySubmissions}</h1>
      {items.length === 0 ? (
        <p className="muted">{T.empty}</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>{T.title}</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.itemType}-${item.submissionId}`}>
                <td>
                  {item.itemType === "source" ? (
                    <Link href={`/library/${item.submissionId}`}>{item.title}</Link>
                  ) : (
                    item.title
                  )}
                </td>
                <td>{item.itemType === "source" ? T.source : T.gapRequest}</td>
                <td>
                  <span className="badge muted">
                    {(item.itemType === "source" ? trustStateLabel : gapLabel)(item.state)}
                  </span>
                </td>
                <td>{item.lastUpdatedAt?.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
