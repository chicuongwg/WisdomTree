import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/app/components/crumbs";
import { ProposalDecision } from "@/app/components/proposal-decision";
import { Markdown } from "@/lib/markdown";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { T } from "@/lib/vi";
import { getNodePublicationReview } from "@/modules/knowledge/service";

export const metadata = { title: T.publicationReviewTitle };

export default async function NodePublicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role === "user") notFound();
  const { id } = await params;
  const item = await orNotFound(() => getNodePublicationReview(toPrincipal(user), id));
  const decided = item.proposal.state !== "pending";

  return (
    <main className="page">
      <Crumbs items={[{ label: T.reviewQueue, href: "/review" }]} />
      <h1>{T.publicationReviewHeading(item.proposal.title)}</h1>
      {decided && <p className="notice">{T.publicationDecided}</p>}
      {decided && item.proposal.decisionNote && (
        <p className="notice">{T.reviewerNotePrefix} {item.proposal.decisionNote}</p>
      )}
      {!item.canReview && !decided && (
        <p className="notice">
          Bạn là người tạo hoặc người gửi đề cử. Một reviewer độc lập khác phải xử lý đề cử này.
        </p>
      )}
      {item.stale && !decided && (
        <p className="notice">
          Trang cá nhân đã thay đổi sau khi gửi. Không thể duyệt snapshot này; hãy yêu cầu người gửi
          tạo đề cử mới.
        </p>
      )}

      <div className="panel">
        <h2>Chuỗi trách nhiệm</h2>
        <ul>
          <li>Tác giả/người gửi: {item.authorName}</li>
          <li>Chuyên đề chung đích: {item.targetBranchName}</li>
          <li>
            Trang cá nhân nguồn:{" "}
            <Link href={`/tree/node/${item.proposal.sourceNodeId}`}>Mở trang</Link>
          </li>
          <li>
            Tư liệu nguồn:{" "}
            {item.source ? (
              <Link href={`/library/${item.source.id}`}>{item.source.title}</Link>
            ) : (
              "Không có — chỉ được duyệt ở mức chưa thẩm định"
            )}
          </li>
        </ul>
      </div>

      <section aria-label="Snapshot Markdown">
        <h2>Snapshot Markdown bất biến</h2>
        <div className="panel">
          <Markdown content={item.proposal.contentMd} />
        </div>
      </section>

      {!decided && (
        <ProposalDecision
          endpoint={`/api/tree/publication-proposals/${item.proposal.id}/decision`}
          withNote
          hasSource={Boolean(item.proposal.sourceVersionId)}
          disabled={!item.canReview}
          approvalDisabled={item.stale}
        />
      )}
    </main>
  );
}
