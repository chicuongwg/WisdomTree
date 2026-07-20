import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listBranches, recentNodes, searchTree } from "@/modules/knowledge/service";
import { T } from "@/lib/vi";
import { VerificationBadge } from "../components/verification-badge";
import { Empty } from "@/app/components/empty";

// Screen: Tree Browse (`/tree`, user-screen-specs.md) — entry into the
// knowledge tree: branch overview, recent nodes, and full-text search.
export default async function TreeBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { q } = await searchParams;
  const [branches, recent, results] = await Promise.all([
    listBranches(actor),
    recentNodes(actor),
    q?.trim() ? searchTree(actor, q) : Promise.resolve(null),
  ]);
  const canEdit = user.role === "editor" || user.role === "admin_op";

  return (
    <main className="page">
      <h1>{T.tree}</h1>
      <form className="inline" method="get" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={`${T.search} trong ${T.tree.toLowerCase()}…`}
          aria-label={T.search}
        />
        <button type="submit">{T.search}</button>
        {canEdit && (
          <Link className="button" href="/tree/branch/new">
            {T.createBranch}
          </Link>
        )}
      </form>

      {results && (
        <section aria-label="Kết quả tìm kiếm">
          <h2>Kết quả cho “{q}”</h2>
          {results.length === 0 ? (
            <p className="muted">Không tìm thấy trang tri thức nào. Thử từ khóa khác.</p>
          ) : (
            <div className="record-scroll">
              <table className="list">
                <thead>
                  <tr>
                    <th scope="col">{T.node}</th>
                    <th scope="col">{T.branch}</th>
                    <th scope="col">{T.verificationLabelTitle}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/tree/node/${r.id}`}>{r.title}</Link>
                        <div className="meta">
                          {r.snippet}…
                        </div>
                      </td>
                      <td>
                        <Link href={`/tree/branch/${r.branchId}`}>{r.branchName}</Link>
                      </td>
                      <td>
                        <VerificationBadge verification={r.verification} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="cards">
        <div className="panel">
          <h2>
            <Link href="/tree/branches">{T.branch}</Link>
          </h2>
          {branches.length === 0 && (
            <Empty
              panel={false}
              title={T.branchesEmptyTitle}
              hint={T.branchesEmptyHint}
              action={canEdit ? { label: T.createBranch, href: "/tree/branch/new" } : undefined}
            />
          )}
          <ul>
            {branches.slice(0, 8).map((b) => (
              <li key={b.id}>
                <Link href={`/tree/branch/${b.id}`}>{b.name}</Link>{" "}
                <span className="muted">
                  {b.nodeCount} {T.node.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2>Trang cập nhật gần đây</h2>
          {recent.length === 0 && (
            // A page is written inside a branch, so the next step is a branch,
            // not a "new page" button.
            <Empty
              panel={false}
              title={T.nodesEmptyTitle}
              hint={T.nodesEmptyHint}
              action={canEdit ? { label: T.navBranches, href: "/tree/branches" } : undefined}
            />
          )}
          <ul>
            {recent.map((n) => (
              <li key={n.id}>
                <Link href={`/tree/node/${n.id}`}>{n.title}</Link>{" "}
                <VerificationBadge verification={n.verification} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
