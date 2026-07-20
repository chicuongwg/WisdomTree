import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getBranch } from "@/modules/knowledge/service";
import { listGapsForBranch } from "@/modules/storage/curation";
import { badgeClass, gapLabel, gapStateLabel, T } from "@/lib/vi";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeCreateForm } from "@/app/components/node-create-form";
import { BranchForm } from "@/app/components/branch-form";

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
        <p className="muted">{T.empty} {canEdit ? "Hãy thêm trang đầu tiên." : ""}</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>{T.title}</th>
              <th>{T.verificationLabelTitle}</th>
              <th>{T.lastUpdated}</th>
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
                <td>{n.updatedAt.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </main>
  );
}
