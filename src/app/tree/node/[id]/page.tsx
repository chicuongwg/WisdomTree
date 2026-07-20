import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import {
  getNode,
  listNodeOptions,
  MAX_LOCAL_DEPTH,
  neighbourGraph,
  wikiIndex,
} from "@/modules/knowledge/service";
import { badgeToneClass, nodeLinkTypeLabel, T } from "@/lib/vi";
import { Markdown } from "@/lib/markdown";
import { NodeLink } from "@/app/components/node-link";
import { KnowledgeMap } from "@/app/components/knowledge-map";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeAdminActions } from "@/app/components/node-admin-actions";
import { NodeExportActions } from "@/app/components/node-export-actions";
import { CommentsSection } from "@/app/components/comments-section";

// Screen: Node Detail (`/tree/node/:id`) — the primary reading surface with
// verification badge and provenance summary (user-screen-specs.md).
export default async function NodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const node = await orNotFound(() => getNode(actor, id));
  const isAdmin = user.role === "admin_op";
  const canEdit = isAdmin || (user.role === "editor" && node.createdBy === user.id);
  const candidates = isAdmin && node.verification !== "archived" ? await listNodeOptions(actor) : [];
  const [wiki, localGraph] = await Promise.all([
    wikiIndex(actor),
    // Fetch the deepest neighbourhood the local map's depth control offers, so
    // moving that slider re-draws from data already on the page instead of
    // making the reader wait for another round trip.
    neighbourGraph(actor, id, MAX_LOCAL_DEPTH),
  ]);

  return (
    <main className="page">
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

      <div className="with-side">
        <div>
          <Markdown content={node.contentMd} wikiIndex={wiki} />
          <section className="panel" aria-labelledby="local-map-h">
            <h2 id="local-map-h">{T.localMap}</h2>
            <KnowledgeMap
              nodes={localGraph.nodes}
              edges={localGraph.edges}
              centerId={node.id}
              height={340}
            />
          </section>
          <CommentsSection anchorType="tree_node" anchorId={node.id} />
        </div>
        <aside>
          <div className="panel">
            <h2>{T.provenance}</h2>
            {node.provenance.length === 0 ? (
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
                      {T.approve}: {p.approvedByName} · {p.createdAt.toLocaleDateString("vi-VN")}
                      {p.excerptChunkIds?.length ? ` · ${p.excerptChunkIds.length} trích đoạn` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
          {isAdmin && node.verification !== "archived" && (
            <NodeAdminActions nodeId={node.id} candidates={candidates} />
          )}
        </aside>
      </div>
    </main>
  );
}
