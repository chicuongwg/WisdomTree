import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listBranches } from "@/modules/knowledge/service";
import { badgeToneClass, T } from "@/lib/vi";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.navBranches };

// Screen: Branch List (`/tree/branches`) — branch cards with node counts and
// verification progress (user-screen-specs.md).
export default async function BranchListPage() {
  const user = await requireUser();
  const branches = await listBranches(toPrincipal(user));
  const canEdit = user.role === "editor" || user.role === "admin_op";

  return (
    <main className="page">
      <h1>{T.navBranches}</h1>
      {/* When the list is empty the empty state carries the create button, so
          this one would be the same button twice. */}
      {canEdit && branches.length > 0 && (
        <p>
          <Link className="button" href="/tree/branch/new">
            {T.createBranch}
          </Link>
        </p>
      )}
      {branches.length === 0 ? (
        <Empty
          title={T.branchesEmptyTitle}
          hint={T.branchesEmptyHint}
          action={canEdit ? { label: T.createBranch, href: "/tree/branch/new" } : undefined}
        />
      ) : (
        <div className="cards">
          {branches.map((b) => (
            <div className="panel" key={b.id}>
              <h2>
                <Link href={`/tree/branch/${b.id}`}>{b.name}</Link>
              </h2>
              {b.description && <p className="muted">{b.description}</p>}
              <p>
                <strong>{b.nodeCount}</strong> {T.node.toLowerCase()} ·{" "}
                {/* A count of nodes that reached `verified` — the same tone as
                    the state it counts, so the card and the node badges agree.
                    Except at zero: a green chip reading "0 đã thẩm định" would
                    claim an achievement that has not happened. */}
                <span className={badgeToneClass(b.verifiedCount > 0 ? "done" : "waiting")}>
                  {b.verifiedCount} đã thẩm định
                </span>
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
