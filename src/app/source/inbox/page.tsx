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
} from "@/lib/vi";

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
        <p className="muted">{T.empty}</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>{T.title}</th>
              <th>Độ tin cậy</th>
              <th>Hiệu đính</th>
              <th>{T.assignee}</th>
              <th>{T.lastUpdated}</th>
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
                <td>{source.updatedAt.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{T.gapRequest}</h2>
      {gapRequests.length === 0 ? (
        <p className="muted">{T.empty}</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>{T.title}</th>
              <th>{T.state}</th>
              <th>{T.lastUpdated}</th>
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
                <td>{g.updatedAt.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
