import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { mySubmissions } from "@/modules/storage/service";
import {
  badgeClass,
  gapLabel,
  gapStateLabel,
  T,
  trustLabel,
  trustStateLabel,
  when,
} from "@/lib/vi";
import { Empty } from "@/app/components/empty";

// Screen: My Submissions (`/source/mine`) — unified intake history over the
// intake_items view (sources + branch-gap requests).
export default async function MySubmissionsPage() {
  const user = await requireUser();
  const items = await mySubmissions(toPrincipal(user));

  return (
    <main className="page">
      <h1>{T.mySubmissions}</h1>
      {items.length === 0 ? (
        // TODO(vi): move to src/lib/vi.ts
        <Empty
          title="Bạn chưa gửi tư liệu nào."
          hint="Tư liệu bạn tải lên và những đề xuất bổ sung bạn nêu đều được liệt kê ở đây."
          action={{ label: T.uploadCta, href: "/source/intake" }}
        />
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.title}</th>
                <th scope="col">Loại</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Cập nhật</th>
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
                    <span
                      className={badgeClass(
                        item.itemType === "source" ? trustLabel : gapStateLabel,
                        item.state,
                      )}
                    >
                      {(item.itemType === "source" ? trustStateLabel : gapLabel)(item.state)}
                    </span>
                  </td>
                  <td>{when(item.lastUpdatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
