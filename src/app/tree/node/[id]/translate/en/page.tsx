import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { getNode, getNodeTranslation, wikiIndex } from "@/modules/knowledge/service";
import { TranslationEditor } from "@/app/components/translation-editor";

export const metadata = { title: "English translation" };

export default async function TranslateNodePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const node = await getNode(actor, id);
  const canTranslate =
    (node.branchScope === "personal" && node.branchOwnerId === user.id) ||
    user.role === "admin_op" ||
    (user.role === "editor" && user.spaceMemberships.some((membership) => membership.spaceId === node.branchSpaceId && membership.role !== "viewer"));
  if (!canTranslate) notFound();
  const [translation, index] = await Promise.all([getNodeTranslation(actor, id, "en"), wikiIndex(actor)]);
  return <main className="page"><h1>English · {node.title}</h1><p className="muted">Bản tiếng Việt là nội dung chính. Bản English của trang team phải qua cùng hàng duyệt.</p><TranslationEditor nodeId={id} nodeSlug={node.slug} translation={translation} wikiIndex={index} /></main>;
}
