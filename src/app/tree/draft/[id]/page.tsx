import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { getDraft, wikiIndex } from "@/modules/knowledge/service";
import { DraftEditor } from "@/app/components/draft-editor";

export const metadata = { title: "Bản nháp mới" };

export default async function NewTeamDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const [draft, index] = await Promise.all([getDraft(actor, id), wikiIndex(actor)]);
  if (draft.nodeId || draft.locale !== "vi") notFound();
  const snapshot = {
    title: draft.title,
    summary: draft.summary,
    sortOrder: draft.sortOrder,
    contentMd: draft.contentMd,
    tags: draft.tags,
    links: draft.links,
  };
  return (
    <main className="page">
      <h1>Bản nháp trang mới</h1>
      <p className="muted">Chỉ bạn thấy nội dung này cho tới khi bấm Xuất bản.</p>
      <DraftEditor
        nodeId={null}
        nodeSlug=""
        locale="vi"
        official={snapshot}
        officialVersion={0}
        baseContent=""
        initialDraft={draft}
        reviewRequired={false}
        wikiIndex={index}
      />
    </main>
  );
}
