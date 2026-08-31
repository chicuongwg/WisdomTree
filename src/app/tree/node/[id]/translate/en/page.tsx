import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import {
  getMyNodeDraft,
  getNode,
  getNodeTranslation,
  wikiIndex,
} from "@/modules/knowledge/service";
import { TranslationEditor } from "@/app/components/translation-editor";
import { DraftEditor } from "@/app/components/draft-editor";

export const metadata = { title: "English translation" };

export default async function TranslateNodePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const node = await getNode(actor, id);
  const canTranslate =
    (node.branchScope === "personal" && node.branchOwnerId === user.id) ||
    user.role === "admin_op" ||
    user.spaceMemberships.some(
      (membership) => membership.spaceId === node.branchSpaceId && membership.role !== "viewer",
    );
  if (!canTranslate) notFound();
  const isPersonal = node.branchScope === "personal";
  const [translation, index, draftState] = await Promise.all([
    getNodeTranslation(actor, id, "en"),
    wikiIndex(actor),
    isPersonal ? Promise.resolve(null) : getMyNodeDraft(actor, id, "en"),
  ]);
  return (
    <main className="page">
      <h1>English · {node.title}</h1>
      <p className="muted">
        Bản tiếng Việt là nội dung chính. Bản English dùng cùng ranh giới draft/official.
      </p>
      {isPersonal ? (
        <TranslationEditor
          nodeId={id}
          nodeSlug={node.slug}
          translation={translation}
          wikiIndex={index}
        />
      ) : (
        <DraftEditor
          nodeId={id}
          nodeSlug={node.slug}
          locale="en"
          official={draftState!.official}
          officialVersion={draftState!.officialVersion}
          baseContent={draftState!.baseContent}
          initialDraft={draftState!.draft}
          reviewRequired={node.reviewRequired}
          wikiIndex={index}
        />
      )}
    </main>
  );
}
