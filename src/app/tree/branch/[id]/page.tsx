import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getBranch, listBranches } from "@/modules/knowledge/service";
import { T, when } from "@/lib/vi";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeCreateForm } from "@/app/components/node-create-form";
import { BranchArchiveButton, BranchForm } from "@/app/components/branch-form";
import { Empty } from "@/app/components/empty";
import { NodeLink } from "@/app/components/node-link";
import { authorize } from "@/modules/auth/authorize";
import type { Principal } from "@/modules/auth/principal";

// Static, not generateMetadata: naming the record in the tab would cost a
// second read of it on every detail view (the getters take a freshly built
// principal, so the request cache cannot dedupe the two calls). The kind of
// screen is what makes a browser history list usable again; the record's own
// name is already the h1.
export const metadata = { title: T.branch };

/**
 * May this reader archive the branch? Asked of the real policy rather than
 * re-stated here: `authorize` throws, so a try/catch is the honest way to turn
 * "would this be allowed" into a boolean. The service enforces it again on the
 * POST — this only decides whether to offer a button that would be refused.
 */
function mayArchive(
  actor: Principal,
  branch: { scope: string; spaceId: string | null; ownerUserId: string | null; createdBy: string },
): boolean {
  try {
    if (branch.scope === "personal") {
      authorize(actor, "knowledge.branch.edit", {
        ownerIds: [branch.ownerUserId, branch.createdBy],
        kind: "write",
      });
    } else {
      authorize(actor, "knowledge.branch.manage", { spaceId: branch.spaceId!, kind: "write" });
    }
    return true;
  } catch {
    return false;
  }
}

// Screen: Branch Hub (`/tree/branch/:id`) — branch summary, node map,
// progress (user-screen-specs.md).
export default async function BranchHubPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const branch = await orNotFound(() => getBranch(actor, id));
  const verified = branch.nodes.filter((n) => n.verification === "verified").length;
  const isOwnPersonalBranch =
    branch.scope === "personal" && (branch.ownerUserId === user.id || branch.createdBy === user.id);
  const canCreateTeamDraft =
    branch.scope === "team" &&
    (user.role === "admin_op" ||
      user.spaceMemberships.some(
        (membership) => membership.spaceId === branch.spaceId && membership.role !== "viewer",
      ));
  const canEdit = isOwnPersonalBranch || canCreateTeamDraft;
  const canEditMeta =
    isOwnPersonalBranch ||
    user.role === "admin_op" ||
    user.spaceMemberships.some(
      (membership) => membership.spaceId === branch.spaceId && membership.role === "manager",
    );
  const siblingBranches = canEditMeta
    ? (await listBranches(actor)).filter(
        (candidate) =>
          candidate.id !== branch.id &&
          candidate.scope === branch.scope &&
          candidate.spaceId === branch.spaceId &&
          candidate.ownerUserId === branch.ownerUserId,
      )
    : [];

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
                    <NodeLink nodeId={n.id} slug={n.slug}>
                      {n.title}
                    </NodeLink>
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
      {canEdit && <NodeCreateForm branchId={branch.id} team={branch.scope === "team"} />}

      {canEditMeta && (
        <>
          <h2>Chỉnh sửa chuyên đề</h2>
          <div className="panel">
            <BranchForm
              branch={branch}
              parents={siblingBranches.map((candidate) => ({
                id: candidate.id,
                name: candidate.name,
              }))}
            />
          </div>
        </>
      )}

      {/* Last on the page on purpose: finishing a chuyên đề is the rarest act
          here, and it should not sit next to the everyday edits. */}
      {mayArchive(actor, branch) && (
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
