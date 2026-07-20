import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getNode, listNodeOptions } from "@/modules/knowledge/service";
import { linkTypeLabel, T } from "@/lib/vi";
import { Markdown } from "@/lib/markdown";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeAdminActions } from "@/app/components/node-admin-actions";
import { NodeExportActions } from "@/app/components/node-export-actions";
import { CommentsSection } from "@/app/components/comments-section";
import { listMentionableUsers } from "@/modules/notify/service";

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
  const mentionOptions = await listMentionableUsers();

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
        {node.publish && <span className="badge verified">{T.publish}</span>}
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
          <Markdown content={node.contentMd} />
          <CommentsSection anchorType="tree_node" anchorId={node.id} mentionOptions={mentionOptions} />
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
          <div className="panel">
            <h2>{T.relatedNodes}</h2>
            {node.links.length === 0 ? (
              <p className="muted">{T.empty}</p>
            ) : (
              <ul>
                {node.links.map((l) => (
                  <li key={`${l.toNodeId}-${l.linkType}`}>
                    <span className="badge muted">{linkTypeLabel[l.linkType] ?? l.linkType}</span>{" "}
                    <Link href={`/tree/node/${l.toNodeId}`}>{l.title}</Link>
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
