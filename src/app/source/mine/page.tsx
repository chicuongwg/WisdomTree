import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { mySubmissions } from "@/modules/storage/service";
import {
  badgeClass,
  curationLabel,
  curationStateLabel,
  gapLabel,
  gapStateLabel,
  T,
  when,
} from "@/lib/vi";
import { nextActionFor, nextActionLabel } from "@/lib/source-status";
import { Empty } from "@/app/components/empty";

// Screen: My Submissions (`/source/mine`) — unified intake history (sources +
// branch-gap requests), each source row carrying the one sentence about what
// happens to it next (functional-spec.md:57).
export default async function MySubmissionsPage() {
  const user = await requireUser();
  const items = await mySubmissions(toPrincipal(user));

  return (
    <main className="page">
      <h1>{T.mySubmissions}</h1>
      {items.length === 0 ? (
        <Empty
          title={T.mySubmissionsEmptyTitle}
          hint={T.mySubmissionsEmptyHint}
          action={{ label: T.uploadCta, href: "/source/intake" }}
        />
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.title}</th>
                <th scope="col">{T.kindColumn}</th>
                <th scope="col">{T.state}</th>
                <th scope="col">{T.nextStepColumn}</th>
                <th scope="col">{T.lastUpdated}</th>
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
                    {/* Trust chip removed from source rows: it showed a state
                        nothing writes. The curation chip carries the state a
                        source actually has; gap requests keep their own. */}
                    {item.itemType === "gap_request" ? (
                      <span className={badgeClass(gapStateLabel, item.state)}>
                        {gapLabel(item.state)}
                      </span>
                    ) : item.curationState ? (
                      <span className={badgeClass(curationStateLabel, item.curationState)}>
                        {curationLabel(item.curationState)}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {item.itemType === "source" ? (
                      nextActionLabel[
                        nextActionFor({
                          storageState: item.storageState,
                          extractionStatus: item.extractionStatus,
                          curationState: item.curationState,
                          curationAssigned: Boolean(item.curationAssignedTo),
                        })
                      ]
                    ) : (
                      <span className="muted">—</span>
                    )}
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
