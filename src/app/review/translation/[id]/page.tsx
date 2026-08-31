import { requireUser, toPrincipal } from "@/lib/page";
import { getTranslationProposal } from "@/modules/knowledge/service";
import { Markdown } from "@/lib/markdown";
import { TranslationDecision } from "@/app/components/translation-decision";

export const metadata = { title: "Duyệt bản English" };

export default async function TranslationReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const row = await getTranslationProposal(toPrincipal(user), id);
  return (
    <main className="page">
      <h1>Duyệt bản English · {row.nodeTitle}</h1>
      <p className="muted">Snapshot đề xuất cho bản {row.proposal.locale.toUpperCase()}.</p>
      <div className="panel"><h2>{row.proposal.title}</h2>{row.proposal.summary && <p>{row.proposal.summary}</p>}<Markdown content={row.proposal.contentMd} /></div>
      <TranslationDecision proposalId={id} disabled={row.proposal.createdBy === user.id || row.proposal.state !== "pending"} />
    </main>
  );
}
