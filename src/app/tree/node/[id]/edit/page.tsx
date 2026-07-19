import { notFound } from "next/navigation";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getNode } from "@/modules/knowledge/service";
import { T } from "@/lib/vi";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeEditor } from "@/app/components/node-editor";

// Screen: Edit Node (`/tree/node/:id/edit`) — Markdown source + preview with
// optimistic locking; access denied (404) when not owned or Admin/Op.
export default async function EditNodePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const node = await orNotFound(() => getNode(actor, id));
  const isAdmin = user.role === "admin_op";
  const canEdit = isAdmin || (user.role === "editor" && node.createdBy === user.id);
  if (!canEdit || node.verification === "archived") notFound();

  return (
    <main className="page">
      <h1>
        {T.editNode} <VerificationBadge verification={node.verification} />
      </h1>
      <p className="muted">
        Phiên bản hiện tại: {node.version}. Nếu người khác lưu trước bạn, hệ thống sẽ báo xung đột
        và giữ nguyên nội dung bạn đang soạn.
      </p>
      <NodeEditor
        node={{
          id: node.id,
          title: node.title,
          contentMd: node.contentMd,
          verification: node.verification,
          publish: node.publish,
          version: node.version,
          tags: node.tags,
        }}
        isAdmin={isAdmin}
      />
    </main>
  );
}
