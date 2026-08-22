import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { mySubmissions } from "@/modules/storage/service";
import { T, when } from "@/lib/vi";
import { nextActionFor, nextActionLabel } from "@/lib/source-status";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.mySubmissions };

// Screen: My Submissions (`/source/mine`) — the member's own uploads, each
// row carrying the one sentence about what happens to it next.
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
                <th scope="col">{T.nextStepColumn}</th>
                <th scope="col">{T.lastUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.submissionId}>
                  <td>
                    <Link href={`/library/${item.submissionId}`}>{item.title}</Link>
                  </td>
                  <td>
                    {
                      nextActionLabel[
                        nextActionFor({
                          storageState: item.storageState,
                          extractionStatus: item.extractionStatus,
                        })
                      ]
                    }
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
