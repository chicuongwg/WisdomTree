import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/app/components/crumbs";
import { NodePublicationDecision } from "@/app/components/node-publication-decision";
import { Markdown } from "@/lib/markdown";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { T } from "@/lib/vi";
import { getNodePublicationReview } from "@/modules/knowledge/service";

export const metadata = { title: "Kiểm chéo đề cử cá nhân" };

export default async function NodePublicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user.capabilities.includes("content.review")) notFound();
  const { id } = await params;
  const item = await orNotFound(() => getNodePublicationReview(toPrincipal(user), id));
  const decided = item.proposal.state !== "pending";

  return (
    <main className="page">
      <Crumbs items={[{ label: T.reviewQueue, href: "/review" }]} />
      <h1>Kiểm chéo: {item.proposal.title}</h1>
      {decided && <p className="notice">Đề cử này đã được xử lý.</p>}
      {decided && item.proposal.decisionNote && (
        <p className="notice">Nhận xét của reviewer: {item.proposal.decisionNote}</p>
      )}
      {!item.canReview && !decided && (
        <p className="notice">
          Bạn là người tạo, người gửi hoặc không có quyền reviewer tại kho đích. Một reviewer độc
          lập khác phải xử lý đề cử này.
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
          <li>SHA-256: {item.proposal.snapshotSha256}</li>
        </ul>
      </div>

      <section aria-label="Snapshot Markdown">
        <h2>Snapshot Markdown bất biến</h2>
        <div className="panel">
          <Markdown content={item.proposal.contentMd} />
        </div>
      </section>

      {!decided && (
        <NodePublicationDecision
          taskId={item.task.id}
          reviewVersion={item.review.version}
          hasSource={Boolean(item.proposal.sourceVersionId)}
          disabled={!item.canReview}
          approvalDisabled={item.stale}
        />
      )}
    </main>
  );
}
