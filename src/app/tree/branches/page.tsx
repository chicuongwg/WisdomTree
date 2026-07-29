import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listBranches } from "@/modules/knowledge/service";
import { badgeToneClass, T } from "@/lib/vi";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.navBranches };

type BranchItem = Awaited<ReturnType<typeof listBranches>>[number];

function BranchCard({ b }: { b: BranchItem }) {
  return (
    <div className="panel" key={b.id}>
      <h3>
        <Link href={`/tree/branch/${b.id}`}>{b.name}</Link>
      </h3>
      {b.description && <p className="muted">{b.description}</p>}
      <p>
        <strong>{b.nodeCount}</strong> {T.node.toLowerCase()} ·{" "}
        <span className={badgeToneClass(b.verifiedCount > 0 ? "done" : "waiting")}>
          {b.verifiedCount} đã thẩm định
        </span>
      </p>
    </div>
  );
}

// Screen: Branch List (`/tree/branches`) — branch cards with node counts and
// verification progress, separated into Team and Personal branches.
export default async function BranchListPage() {
  const user = await requireUser();
  const branches = await listBranches(toPrincipal(user));
  const canEdit = user.role === "editor" || user.role === "admin_op";

  const teamBranches = branches.filter((b) => b.scope === "team" || !b.scope);
  const personalBranches = branches.filter((b) => b.scope === "personal");

  return (
    <main className="page">
      <h1>{T.navBranches}</h1>
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
        <>
          <section aria-label="Kho dự án chung" style={{ marginBottom: "2rem" }}>
            <h2>Kho dự án chung</h2>
            {teamBranches.length === 0 ? (
              <p className="muted">Chưa có chuyên đề chung nào.</p>
            ) : (
              <div className="cards">
                {teamBranches.map((b) => (
                  <BranchCard key={b.id} b={b} />
                ))}
              </div>
            )}
          </section>

          <section aria-label="Tài liệu cá nhân">
            <h2>Tài liệu cá nhân</h2>
            {personalBranches.length === 0 ? (
              <p className="muted">Chưa có chuyên đề cá nhân nào.</p>
            ) : (
              <div className="cards">
                {personalBranches.map((b) => (
                  <BranchCard key={b.id} b={b} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
