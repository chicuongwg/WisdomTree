import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { listInbox } from "@/modules/storage/curation";
import {
  badgeClass,
  badgeToneClass,
  curationLabel,
  curationStateLabel,
  gapLabel,
  gapStateLabel,
  T,
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
        <Empty
          title={T.sourceInboxEmptyTitle}
          hint={T.sourceInboxEmptyHint}
          action={{ label: T.uploadCta, href: "/source/intake" }}
        />
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                {/* Trust column removed: it showed a state nothing writes. */}
                <th scope="col">{T.title}</th>
                <th scope="col">{T.curationColumn}</th>
                <th scope="col">{T.assignee}</th>
                <th scope="col">{T.lastUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(({ source, assigneeName, curationState, curationAssignedTo }) => (
                <tr key={source.id}>
                  <td>
                    <Link href={`/source/${source.id}`}>{source.title}</Link>
                  </td>
                  <td>
                    {curationState === "under_correction" && !curationAssignedTo ? (
                      // A member's self-nomination waiting for an editor.
                      <span className={badgeToneClass("active")}>{T.nominatedAwaitingAssign}</span>
                    ) : curationState ? (
                      <span className={badgeClass(curationStateLabel, curationState)}>
                        {curationLabel(curationState)}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{assigneeName ?? <span className="muted">{T.noAssignee}</span>}</td>
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
        // admin can press here.
        <Empty title={T.gapRequestsEmptyTitle} hint={T.gapRequestsEmptyHint} />
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
