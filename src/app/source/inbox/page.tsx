import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { listInbox } from "@/modules/storage/curation";
import {
  badgeClass,
  curationLabel,
  curationStateLabel,
  gapLabel,
  gapStateLabel,
  T,
  trustLabel,
  trustStateLabel,
  when,
} from "@/lib/vi";
import { Empty } from "@/app/components/empty";

// Screen: Source Inbox (`/source/inbox`, admin-op-screen-specs.md) — triage
// surface over all intake items: file-backed sources and gap requests.
export default async function SourceInboxPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") notFound();
  const { sources, gapRequests } = await listInbox(toPrincipal(user));

  const unassigned = sources.filter((s) => !s.source.assignedTo).length;
  const inCuration = sources.filter((s) => s.curationState === "under_correction").length;
  const readyForReview = sources.filter((s) => s.curationState === "ready_for_review").length;

  return (
    <main className="page">
      <h1>{T.sourceInbox}</h1>
      <div className="stat-row">
        <div className="stat">
          <strong>{sources.length}</strong> {T.source}
        </div>
        <div className="stat">
          <strong>{unassigned}</strong> Chưa giao việc
        </div>
        <div className="stat">
          <strong>{inCuration}</strong> Đang hiệu đính
        </div>
        <div className="stat">
          <strong>{readyForReview}</strong> Chờ duyệt xuất bản
        </div>
        <div className="stat">
          <strong>{gapRequests.length}</strong> {T.gapRequest}
        </div>
      </div>

      <h2>{T.source}</h2>
      {sources.length === 0 ? (
        // TODO(vi): move to src/lib/vi.ts
        <Empty
          title="Chưa có tư liệu nào được gửi lên."
          hint="Khi thành viên gửi tư liệu, chúng vào đây để bạn giao việc hiệu đính. Bạn cũng tự gửi được."
          action={{ label: T.uploadCta, href: "/source/intake" }}
        />
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.title}</th>
                <th scope="col">Độ tin cậy</th>
                <th scope="col">Hiệu đính</th>
                <th scope="col">{T.assignee}</th>
                <th scope="col">{T.lastUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(({ source, assigneeName, curationState }) => (
                <tr key={source.id}>
                  <td>
                    <Link href={`/source/${source.id}`}>{source.title}</Link>
                  </td>
                  <td>
                    <span className={badgeClass(trustLabel, source.trustStatus)}>
                      {trustStateLabel(source.trustStatus)}
                    </span>
                  </td>
                  <td>
                    {curationState ? (
                      <span className={badgeClass(curationStateLabel, curationState)}>
                        {curationLabel(curationState)}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{assigneeName ?? <span className="muted">Chưa giao</span>}</td>
                  <td>{when(source.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>{T.gapRequest}</h2>
      {gapRequests.length === 0 ? (
        // No button: the upload action above already covers the one thing an
        // admin can press here. TODO(vi): move to src/lib/vi.ts
        <Empty
          title="Chưa có đề xuất bổ sung nào."
          hint="Thành viên gửi đề xuất khi cần một tư liệu mà kho chưa có; đề xuất sẽ hiện ở đây."
        />
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.title}</th>
                <th scope="col">{T.state}</th>
                <th scope="col">{T.lastUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {gapRequests.map((g) => (
                <tr key={g.id}>
                  <td>
                    <Link href={`/source/${g.id}`}>{g.title}</Link>
                  </td>
                  <td>
                    <span className={badgeClass(gapStateLabel, g.state)}>{gapLabel(g.state)}</span>
                  </td>
                  <td>{when(g.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
