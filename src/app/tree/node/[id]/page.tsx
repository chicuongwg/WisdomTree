import { Crumbs } from "@/app/components/crumbs";
import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import {
  getNode,
  getLatestPublicationForNode,
  listNodeOptions,
  listPublicationTargets,
  wikiIndex,
} from "@/modules/knowledge/service";
import { badgeToneClass, day, nodeLinkTypeLabel, T } from "@/lib/vi";
import { Markdown } from "@/lib/markdown";
import { NodeLink } from "@/app/components/node-link";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeAdminActions } from "@/app/components/node-admin-actions";
import { NodeExportActions } from "@/app/components/node-export-actions";
import { listMentionCandidates } from "@/modules/notify/service";
import { CommentsSection } from "@/app/components/comments-section";
import { PresenceRow } from "@/app/components/presence-row";
import { NodePublicationAction } from "@/app/components/node-publication-action";

// Static, not generateMetadata: naming the record in the tab would cost a
// second read of it on every detail view (the getters take a freshly built
// principal, so the request cache cannot dedupe the two calls). The kind of
// screen is what makes a browser history list usable again; the record's own
// name is already the h1.
export const metadata = { title: T.node };

// Screen: Node Detail (`/tree/node/:id`) — the primary reading surface with
// verification badge and provenance summary (user-screen-specs.md).
export default async function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const node = await orNotFound(() => getNode(actor, id));
  const isOwnPersonalNode =
    node.branchScope === "personal" &&
    (node.branchOwnerId === user.id || node.createdBy === user.id);
  const vaultGrant = actor.vaultGrants?.find((grant) => grant.vaultId === node.branchVaultId)?.grant;
  const canManageShared =
    user.role === "editor" && (vaultGrant === "editor" || vaultGrant === "owner");
  const canEdit =
    isOwnPersonalNode || (canManageShared && node.createdBy === user.id);
  const candidates =
    canManageShared && node.verification !== "archived" ? await listNodeOptions(actor) : [];
  const [publicationTargets, pendingPublication] = isOwnPersonalNode
    ? await Promise.all([
        listPublicationTargets(actor),
        getLatestPublicationForNode(actor, node.id),
      ])
    : [[], null];
  const wiki = await wikiIndex(actor);

  return (
    <main className="page">
      <Crumbs items={[{ label: T.tree, href: "/tree" }]} />
      {node.canonicalNodeId && (
        <p className="notice">
          {T.mergedNotice}{" "}
          <Link href={`/tree/node/${node.canonicalNodeId}`}>{T.openCanonical}</Link>
        </p>
      )}
      <h1>
        {node.title} <VerificationBadge verification={node.verification} />
        {/* Published is an outcome, not an enum row of its own: `done` tone. */}
        {node.publish && <span className={badgeToneClass("done")}>{T.publish}</span>}
      </h1>
      <p className="muted">
        {T.branch}: <Link href={`/tree/branch/${node.branchId}`}>{node.branchName}</Link>
        {node.tags.length > 0 && (
          <>
            {" · "}
            {T.tags}: {node.tags.join(", ")}
          </>
        )}
      </p>
      {/* The same page key as the editor, on purpose: the reader sitting on
          this page is exactly who the editor needs to know about, and the
          editor is exactly who this reader needs to know about before they
          click "sửa". A separate key per screen would split one room in two. */}
      <PresenceRow pageKey={`node:${node.id}`} />

      <div className="with-side">
        <div>
          <Markdown content={node.contentMd} wikiIndex={wiki} />
          {/* A second map lived here: ~600px of settings, zoom buttons, canvas,
              mouse-and-keyboard help and legend, to draw two dots and one line.
              The two link panels in the rail already name those relationships,
              in words and with context. One link into the real map instead. */}
          <p>
            <Link href={`/graph?node=${node.id}`}>{T.openOnMap}</Link>
          </p>
          <CommentsSection
            anchorType="tree_node"
            anchorId={node.id}
            members={await listMentionCandidates("tree_node", node.id)}
          />
        </div>
        <div>
          <div className="panel">
            <h2>{T.provenance}</h2>
            {node.provenance.length === 0 && node.personalOrigins.length === 0 ? (
              <p className="muted">
                {node.verification === "no_source"
                  ? "Trang tạo thủ công, chưa gắn tư liệu dẫn chứng."
                  : T.empty}
              </p>
            ) : (
              <ul>
                {node.provenance.map((p, i) => (
                  <li key={i}>
                    <Link href={`/library/${p.sourceId}`}>{p.sourceTitle}</Link>
                    <div className="meta">
                      {T.approvedByLabel}: {p.approvedByName} · {day(p.createdAt)}
                      {p.excerptChunkIds?.length ? ` · ${p.excerptChunkIds.length} trích đoạn` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {node.personalOrigins.map((origin) => (
              <p key={origin.sourceNodeId}>
                Từ trang cá nhân:{" "}
                <Link href={`/tree/node/${origin.sourceNodeId}`}>{origin.sourceTitle}</Link>
                <span className="meta">
                  {" "}
                  · {T.approvedByLabel}: {origin.approvedByName}
                </span>
              </p>
            ))}
          </div>
          {/* Outgoing: pages this one points at (wiki-links + typed links). */}
          <div className="panel">
            <h2>{T.outgoingLinks}</h2>
            {node.links.length === 0 ? (
              <p className="muted">{T.wikiHelp}</p>
            ) : (
              <ul className="link-list">
                {node.links.map((l) => (
                  <li key={`${l.toNodeId}-${l.linkType}`}>
                    <span className="badge muted">{nodeLinkTypeLabel(l.linkType)}</span>{" "}
                    <NodeLink nodeId={l.toNodeId}>{l.title}</NodeLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Incoming: who points here. Separate from provenance on purpose —
              provenance is "what source backs this", this is "who cites it". */}
          <div className="panel">
            <h2>{T.backlinks}</h2>
            {node.backlinks.length === 0 ? (
              <p className="muted">{T.noBacklinks}</p>
            ) : (
              <ul className="link-list">
                {node.backlinks.map((b) => (
                  <li key={`${b.fromNodeId}-${b.linkType}`}>
                    <span className="badge muted">{nodeLinkTypeLabel(b.linkType)}</span>{" "}
                    <NodeLink nodeId={b.fromNodeId} verification={b.verification}>
                      {b.title}
                    </NodeLink>
                    {b.context && <span className="backlink-context">{b.context}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {node.verification !== "archived" && <NodeExportActions nodeId={node.id} />}
          {canEdit && node.verification !== "archived" && (
            <p>
              <Link className="button" href={`/tree/node/${node.id}/edit`}>
                {T.editNode}
              </Link>
            </p>
          )}
          {canManageShared && node.verification !== "archived" && (
            <NodeAdminActions nodeId={node.id} candidates={candidates} />
          )}
          {isOwnPersonalNode && node.verification !== "archived" && (
            <NodePublicationAction
              nodeId={node.id}
              branches={publicationTargets}
              latest={pendingPublication}
            />
          )}
        </div>
      </div>
    </main>
  );
}
