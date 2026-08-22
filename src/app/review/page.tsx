import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { listPendingProposals } from "@/modules/knowledge/service";
import { T, when } from "@/lib/vi";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.reviewQueue };

// Screen: Review (`/review`) — the single review boundary of the two-tier
// model: pending promotions of personal nodes, and pending change proposals
// on promoted nodes. Read straight from the knowledge services; no queue
// machinery behind it.
export default async function ReviewQueuePage() {
  const user = await requireUser();
  if (user.role === "user") notFound();
  const { publications, changes } = await listPendingProposals(toPrincipal(user));
  const total = publications.length + changes.length;

  return (
    <main className="page">
      <h1>{T.reviewQueue}</h1>
      <div className="stat-row">
        <div className="stat">
          <strong>{total}</strong> {T.pendingReviewStat}
        </div>
      </div>

      {total === 0 ? (
        <Empty title={T.reviewQueueEmptyTitle} hint={T.reviewQueueEmptyHint} />
      ) : (
        <>
          <section aria-labelledby="review-publications">
            <h2 id="review-publications">{T.publicationSection}</h2>
            {publications.length === 0 ? (
              <p className="muted">{T.noPendingPublications}</p>
            ) : (
              <div className="record-scroll">
                <table className="list">
                  <thead>
                    <tr>
                      <th scope="col">{T.title}</th>
                      <th scope="col">{T.targetBranchColumn}</th>
                      <th scope="col">{T.submitterColumn}</th>
                      <th scope="col">{T.submittedAtColumn}</th>
                      <th scope="col">
                        <span className="muted">{T.actionsColumn}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {publications.map((p) => (
                      <tr key={p.id}>
                        <td>{p.title}</td>
                        <td>{p.targetBranchName}</td>
                        <td>{p.authorName}</td>
                        <td>{when(p.createdAt)}</td>
                        <td>
                          <Link className="button" href={`/review/node-publication/${p.id}`}>
                            {T.publishReview}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="review-changes">
            <h2 id="review-changes">{T.changeProposalSection}</h2>
            {changes.length === 0 ? (
              <p className="muted">{T.noPendingChanges}</p>
            ) : (
              <div className="record-scroll">
                <table className="list">
                  <thead>
                    <tr>
                      <th scope="col">{T.title}</th>
                      <th scope="col">{T.proposerColumn}</th>
                      <th scope="col">{T.submittedAtColumn}</th>
                      <th scope="col">
                        <span className="muted">{T.actionsColumn}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link href={`/tree/node/${c.nodeId}`}>{c.title}</Link>
                        </td>
                        <td>{c.authorName}</td>
                        <td>{when(c.createdAt)}</td>
                        <td>
                          <Link className="button" href={`/review/change/${c.id}`}>
                            {T.publishReview}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
