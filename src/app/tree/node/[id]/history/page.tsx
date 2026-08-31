import Link from "next/link";
import { Crumbs } from "@/app/components/crumbs";
import { DiffView } from "@/app/components/diff-view";
import { RevertNodeButton } from "@/app/components/revert-node-button";
import { RestoreDraftButton } from "@/app/components/restore-draft-button";
import { VerificationBadge } from "@/app/components/verification-badge";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { changeSummaryLabel, T, when } from "@/lib/vi";
import { getNode, getNodeVersion, listNodeVersions } from "@/modules/knowledge/service";

export const metadata = { title: T.nodeHistory };

// Screen: Node history (`/tree/node/:id/history`) — the version list with
// pick-two compare and restore. ?a=&b= choose the versions; default compares
// the two newest. Restore appends, never rewrites.
export default async function NodeHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const query = await searchParams;
  const [{ node, versions }, fullNode] = await Promise.all([
    orNotFound(() => listNodeVersions(actor, id)),
    orNotFound(() => getNode(actor, id)),
  ]);

  const seqs = versions.map((v) => v.seq);
  const parse = (raw: string | undefined) => {
    const n = Number(raw);
    return Number.isInteger(n) && seqs.includes(n) ? n : undefined;
  };
  // Default: the newest change — previous version (a) against latest (b).
  const b = parse(query.b) ?? seqs[0];
  const a = parse(query.a) ?? seqs.find((s) => s < b) ?? b;
  const [versionA, versionB] =
    versions.length > 0
      ? await Promise.all([getNodeVersion(actor, id, a), getNodeVersion(actor, id, b)])
      : [null, null];

  const isOwnPersonalNode =
    fullNode.branchScope === "personal" &&
    (fullNode.branchOwnerId === user.id || fullNode.createdBy === user.id);
  const canDraftSharedNode =
    fullNode.branchScope === "team" &&
    (user.role === "admin_op" ||
      user.spaceMemberships.some(
        (membership) =>
          membership.spaceId === fullNode.branchSpaceId && membership.role !== "viewer",
      ));

  return (
    <main className="page">
      <Crumbs items={[{ label: node.title, href: `/tree/node/${id}` }]} />
      <h1>
        {T.nodeHistory}: {node.title}
      </h1>

      {versionA && versionB && a !== b && (
        <section aria-label={T.compareColumn}>
          <h2>{T.compareVersions(a, b)}</h2>
          <DiffView before={versionA.contentMd} after={versionB.contentMd} />
        </section>
      )}

      <div className="record-scroll">
        <table className="list">
          <thead>
            <tr>
              <th scope="col">{T.versionColumnShort}</th>
              <th scope="col">{T.state}</th>
              <th scope="col">{T.summaryColumn}</th>
              <th scope="col">{T.savedByColumn}</th>
              <th scope="col">{T.savedAtColumn}</th>
              <th scope="col">
                <span className="muted">{T.compareColumn}</span>
              </th>
              <th scope="col">
                <span className="muted">{T.actionsColumn}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.seq}>
                <td>{v.seq}</td>
                <td>
                  <VerificationBadge
                    verification={v.verification as "no_source" | "unverified" | "verified"}
                  />
                </td>
                <td>{changeSummaryLabel(v.changeSummary) ?? <span className="muted">—</span>}</td>
                <td>{v.authorName}</td>
                <td>{when(v.createdAt)}</td>
                <td>
                  <Link href={`/tree/node/${id}/history?a=${v.seq}&b=${b}`}>
                    {T.compareWith(b)}
                  </Link>
                  {" · "}
                  <Link href={`/tree/node/${id}/history?a=${a}&b=${v.seq}`}>{T.compareAsNew}</Link>
                </td>
                <td>
                  {/* Restore only the version currently loaded on the left of
                      the compare — pick it first, read the diff, then restore. */}
                  {isOwnPersonalNode && v.seq !== seqs[0] && v.seq === versionA?.seq ? (
                    <RevertNodeButton
                      nodeId={id}
                      seq={v.seq}
                      contentMd={versionA.contentMd}
                      expectedVersion={node.version}
                    />
                  ) : canDraftSharedNode && v.seq !== seqs[0] && v.seq === versionA?.seq ? (
                    <RestoreDraftButton nodeId={id} seq={v.seq} />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
