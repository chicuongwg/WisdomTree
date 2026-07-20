import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getBranch } from "@/modules/knowledge/service";
import { listGapsForBranch } from "@/modules/storage/curation";
import { badgeClass, gapLabel, gapStateLabel, T, when } from "@/lib/vi";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeCreateForm } from "@/app/components/node-create-form";
import { BranchArchiveButton, BranchForm } from "@/app/components/branch-form";
import { Empty } from "@/app/components/empty";
import { authorize } from "@/modules/auth/authorize";
import type { Principal } from "@/modules/auth/dev-auth";

/**
 * May this reader archive the branch? Asked of the real policy rather than
 * re-stated here: `authorize` throws, so a try/catch is the honest way to turn
 * "would this be allowed" into a boolean. The service enforces it again on the
 * POST — this only decides whether to offer a button that would be refused.
 */
function mayArchive(actor: Principal): boolean {
  try {
    authorize(actor, "knowledge.archive", { kind: "write" });
    return true;
  } catch {
    return false;
  }
}

// Screen: Branch Hub (`/tree/branch/:id`) — branch summary, node map,
// progress, and open gaps (user-screen-specs.md).
export default async function BranchHubPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const branch = await orNotFound(() => getBranch(actor, id));
  const gaps = await listGapsForBranch(actor, id);

  const verified = branch.nodes.filter((n) => n.verification === "verified").length;
  const canEdit = user.role === "editor" || user.role === "admin_op";
  const canEditMeta = user.role === "admin_op" || branch.createdBy === user.id;

  return (
    <main className="page">
      <h1>
        {branch.name} <span className="muted">· {T.branch}</span>
      </h1>
      {branch.description && <p className="muted">{branch.description}</p>}
      <div className="stat-row">
        <div className="stat">
          <strong>{branch.nodes.length}</strong> {T.node}
        </div>
        <div className="stat">
          <strong>{verified}</strong> Đã thẩm định
        </div>
        <div className="stat">
          <strong>{gaps.length}</strong> {T.gapRequest}
        </div>
      </div>

      <h2>{T.node}</h2>
      {branch.nodes.length === 0 ? (
        // The create form sits right below for an editor, so the empty state
        // points at it instead of adding a second button.
        <Empty
          title={T.branchNodesEmptyTitle}
          hint={canEdit ? T.branchNodesEmptyHintEditor : T.branchNodesEmptyHintReader}
        />
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.title}</th>
                <th scope="col">{T.verificationLabelTitle}</th>
                <th scope="col">{T.lastUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {branch.nodes.map((n) => (
                <tr key={n.id}>
                  <td>
                    <Link href={`/tree/node/${n.id}`}>{n.title}</Link>
                  </td>
                  <td>
                    <VerificationBadge verification={n.verification} />
                  </td>
                  <td>{when(n.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canEdit && <NodeCreateForm branchId={branch.id} />}

      {gaps.length > 0 && (
        <>
          <h2>{T.gapRequest}</h2>
          <ul>
            {gaps.map((g) => (
              <li key={g.id}>
                {g.title}{" "}
                <span className={badgeClass(gapStateLabel, g.state)}>{gapLabel(g.state)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {canEditMeta && (
        <>
          <h2>Chỉnh sửa chuyên đề</h2>
          <div className="panel">
            <BranchForm branch={branch} />
          </div>
        </>
      )}

      {/* Last on the page on purpose: finishing a chuyên đề is the rarest act
          here, and it should not sit next to the everyday edits. */}
      {mayArchive(actor) && (
        <>
          <h2>{T.branchDone}</h2>
          <div className="panel">
            <p className="muted">{T.branchDoneHint}</p>
            <BranchArchiveButton branchId={branch.id} />
          </div>
        </>
      )}
    </main>
  );
}
