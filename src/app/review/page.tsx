import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { listReviewQueue } from "@/modules/storage/curation";
import {
  badgeClass,
  reviewLabel,
  reviewStateLabel,
  reviewTaskTypeLabel,
  reviewTypeLabel,
  T,
  targetKindLabel,
  when,
} from "@/lib/vi";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.reviewQueue };

// Screen: Review Queue (`/review`, admin-op-screen-specs.md) — the central
// decision surface; publish tasks open the Publish Review workbench.
export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ taskType?: string; state?: string }>;
}) {
  const user = await requireUser();
  if (!user.capabilities.includes("content.review")) notFound();
  const { taskType, state } = await searchParams;
  const tasks = await listReviewQueue(toPrincipal(user), {
    taskType: taskType || undefined,
    state: state || undefined,
  });

  const open = tasks.filter((t) =>
    t.targetType === "node_publication_proposal"
      ? ["queued", "assigned", "in_review"].includes(t.state)
      : ["queued", "assigned", "in_review", "changes_requested"].includes(t.state),
  ).length;

  return (
    <main className="page">
      <h1>{T.reviewQueue}</h1>
      <div className="stat-row">
        <div className="stat">
          <strong>{tasks.length}</strong> Tổng số việc
        </div>
        <div className="stat">
          <strong>{open}</strong> Đang chờ xử lý
        </div>
      </div>
      <form className="inline" method="get">
        <label htmlFor="filter-type" className="muted">
          {T.taskType}
        </label>
        <select id="filter-type" name="taskType" defaultValue={taskType ?? ""}>
          <option value="">Tất cả</option>
          {Object.entries(reviewTaskTypeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label htmlFor="filter-state" className="muted">
          {T.state}
        </label>
        <select id="filter-state" name="state" defaultValue={state ?? ""}>
          <option value="">Tất cả</option>
          {Object.entries(reviewStateLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit">{T.search}</button>
      </form>

      {tasks.length === 0 ? (
        taskType || state ? (
          <Empty title={T.noMatches} action={<Link href="/review">{T.clearFilters}</Link>} />
        ) : (
          <Empty
            title={T.reviewQueueEmptyTitle}
            hint={T.reviewQueueEmptyHint}
            action={{ label: T.sourceInbox, href: "/source/inbox" }}
          />
        )
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.taskType}</th>
                <th scope="col">{T.targetColumn}</th>
                <th scope="col">{T.state}</th>
                <th scope="col">{T.assignee}</th>
                <th scope="col">{T.lastUpdated}</th>
                <th scope="col">
                  <span className="muted">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{reviewTypeLabel(t.taskType)}</td>
                  <td>
                    {t.target ? (
                      <Link href={t.target.href}>{t.target.title}</Link>
                    ) : (
                      <span className="muted">{targetKindLabel(t.targetType)}</span>
                    )}
                  </td>
                  <td>
                    <span className={badgeClass(reviewStateLabel, t.state)}>
                      {reviewLabel(t.state)}
                    </span>
                  </td>
                  <td>{t.assigneeName ?? <span className="muted">—</span>}</td>
                  <td>{when(t.updatedAt)}</td>
                  <td>
                    {t.targetType === "node_publication_proposal" &&
                    ["queued", "assigned", "in_review"].includes(t.state) ? (
                      <Link className="button" href={`/review/node-publication/${t.id}`}>
                        {T.publishReview}
                      </Link>
                    ) : (
                      t.taskType === "publish" &&
                      ["queued", "assigned", "in_review"].includes(t.state) && (
                        <Link className="button" href={`/review/publish/${t.id}`}>
                          {T.publishReview}
                        </Link>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
