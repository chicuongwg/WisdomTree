import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/app/components/crumbs";
import { DiffView } from "@/app/components/diff-view";
import { ProposalDecision } from "@/app/components/proposal-decision";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { T, when } from "@/lib/vi";
import { getNodeChangeProposal } from "@/modules/knowledge/service";

export const metadata = { title: T.changeReviewTitle };

// Screen: Change-proposal review (`/review/change/:id`) — a proposed edit to
// a promoted node, shown as a diff against the node's CURRENT text, decided
// by an independent reviewer.
export default async function ChangeProposalReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role === "user") notFound();
  const { id } = await params;
  const item = await orNotFound(() => getNodeChangeProposal(toPrincipal(user), id));
  const decided = item.proposal.state !== "pending";

  return (
    <main className="page">
      <Crumbs items={[{ label: T.reviewQueue, href: "/review" }]} />
      <h1>{T.changeReviewHeading(item.proposal.title)}</h1>
      <p className="muted">
        {T.proposerLabel} {item.authorName} · {when(item.proposal.createdAt)} ·{" "}
        <Link href={`/tree/node/${item.proposal.nodeId}`}>{T.openCurrentNode}</Link>
      </p>
      {decided && <p className="notice">{T.proposalDecided}</p>}
      {!item.canReview && !decided && (
        <p className="notice">{T.ownProposalNotice}</p>
      )}
      {item.stale && !decided && (
        <p className="notice">{T.changeStale(item.proposal.baseVersion, item.nodeVersion)}</p>
      )}

      {item.nodeTitle !== item.proposal.title && (
        <p>
          {T.titleChangeLabel} <s>{item.nodeTitle}</s> → <strong>{item.proposal.title}</strong>
        </p>
      )}
      <section aria-label={T.diffAriaLabel}>
        <h2>{T.contentChangesHeading}</h2>
        <DiffView before={item.nodeContentMd} after={item.proposal.contentMd} />
      </section>

      {!decided && (
        <ProposalDecision
          endpoint={`/api/tree/nodes/${item.proposal.nodeId}/proposals/${item.proposal.id}/review`}
          withNote={false}
          hasSource
          disabled={!item.canReview}
          approvalDisabled={item.stale}
        />
      )}
    </main>
  );
}
