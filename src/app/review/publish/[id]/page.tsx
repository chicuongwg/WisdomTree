import Link from "next/link";
import { notFound } from "next/navigation";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getPublishReview } from "@/modules/storage/curation";
import { listBranches } from "@/modules/knowledge/service";
import { curationLabel, reviewLabel, T } from "@/lib/vi";
import { Markdown } from "@/lib/markdown";
import { PublishDecision } from "@/app/components/publish-decision";

// Screen: Publish Review (`/review/publish/:id`, admin-op-screen-specs.md) —
// corrected text vs draft comparison, excerpt mapping, accountability chain,
// and the final publish decision.
export default async function PublishReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "admin_op") notFound();
  const actor = toPrincipal(user);
  const { id } = await params;
  const review = await orNotFound(() => getPublishReview(actor, id));
  const branches = await listBranches(actor);
  const decided = review.curation?.state !== "ready_for_review";

  return (
    <main className="page">
      <h1>
        {T.publishReview}: {review.source.title}
      </h1>
      <p>
        <span className="badge muted">{reviewLabel(review.reviewTask.state)}</span>{" "}
        {review.curation && (
          <span className="badge muted">{curationLabel(review.curation.state)}</span>
        )}{" "}
        · <Link href={`/source/${review.source.id}`}>Chi tiết tư liệu</Link>
      </p>
      {decided && (
        <p className="notice">Việc duyệt này đã được xử lý; nội dung dưới đây chỉ để tham khảo.</p>
      )}

      <div className="panel">
        <h2>Chuỗi trách nhiệm</h2>
        <ul>
          <li>
            {T.uploader}: {review.uploader?.name ?? "—"}
          </li>
          <li>Người hiệu đính: {review.assignee?.name ?? "—"}</li>
          <li>Người duyệt xuất bản: {user.displayName} (bạn)</li>
          {review.suggestedBranch && (
            <li>
              {T.suggestedBranch}: {review.suggestedBranch.name}
            </li>
          )}
        </ul>
      </div>

      <div className="split">
        <section aria-label={T.correctedText}>
          <h2>{T.correctedText}</h2>
          {review.correctedText ? (
            <pre className="raw-text">{review.correctedText.content}</pre>
          ) : (
            <p className="muted">Chưa có bản hiệu đính.</p>
          )}
        </section>
        <section aria-label={T.markdownDraft}>
          <h2>{T.markdownDraft}</h2>
          {review.draft ? (
            <Markdown content={review.draft.contentMd} />
          ) : (
            <p className="muted">Chưa có bản thảo — không thể xuất bản.</p>
          )}
        </section>
      </div>

      {!decided && (
        <PublishDecision
          sourceId={review.source.id}
          versionId={review.sourceVersion.id}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          suggestedBranchId={review.draft?.suggestedBranchId ?? null}
          chunks={review.chunks.map((c) => ({ id: c.id, refLabel: c.refLabel }))}
        />
      )}
    </main>
  );
}
