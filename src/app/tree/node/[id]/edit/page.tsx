import { notFound } from "next/navigation";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getNode } from "@/modules/knowledge/service";
import { T } from "@/lib/vi";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeEditor } from "@/app/components/node-editor";
import { PresenceRow } from "@/app/components/presence-row";

// Static, not generateMetadata: naming the record in the tab would cost a
// second read of it on every detail view (the getters take a freshly built
// principal, so the request cache cannot dedupe the two calls). The kind of
// screen is what makes a browser history list usable again; the record's own
// name is already the h1.
export const metadata = { title: T.editNode };

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
      {/* The optimistic-lock counter used to lead this sentence: "Phiên bản
          hiện tại: 7". It is a number the reader can do nothing with, about a
          mechanism they did not ask about, and it buried the part that
          matters — that their paragraph is safe if someone else saves first. */}
      <p className="muted">{T.editNodeConflictNote}</p>
      {/* This is the screen the owner's "tránh sửa đè" is about: long-form
          Markdown, typed over minutes, where losing the conflict means
          retyping a paragraph. Shares its page key with the reading view. */}
      <PresenceRow pageKey={`node:${node.id}`} />
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
