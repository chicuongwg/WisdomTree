import { notFound } from "next/navigation";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getMyNodeDraft, getNode, wikiIndex } from "@/modules/knowledge/service";
import { T } from "@/lib/vi";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeEditor } from "@/app/components/node-editor";
import { DraftEditor } from "@/app/components/draft-editor";
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
  const [node, wiki] = await Promise.all([orNotFound(() => getNode(actor, id)), wikiIndex(actor)]);
  const isOwnPersonalNode =
    node.branchScope === "personal" &&
    (node.branchOwnerId === user.id || node.createdBy === user.id);
  // Personal nodes save directly; team nodes edit a private draft.
  const canDraft =
    node.branchScope === "team" &&
    (user.role === "admin_op" ||
      user.spaceMemberships.some(
        (membership) => membership.spaceId === node.branchSpaceId && membership.role !== "viewer",
      ));
  if ((!isOwnPersonalNode && !canDraft) || node.verification === "archived") notFound();

  const draftState = canDraft ? await getMyNodeDraft(actor, id, "vi") : null;

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
      {isOwnPersonalNode ? (
        <NodeEditor
          node={{
            id: node.id,
            title: node.title,
            summary: node.summary,
            sortOrder: node.sortOrder,
            contentMd: node.contentMd,
            version: node.version,
            tags: node.tags,
          }}
          wikiIndex={wiki}
        />
      ) : (
        <DraftEditor
          nodeId={node.id}
          nodeSlug={node.slug}
          locale="vi"
          official={draftState!.official}
          officialVersion={draftState!.officialVersion}
          baseContent={draftState!.baseContent}
          initialDraft={draftState!.draft}
          reviewRequired={node.reviewRequired}
          wikiIndex={wiki}
        />
      )}
    </main>
  );
}
