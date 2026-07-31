import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { db } from "../../src/db";
import { users } from "../../src/modules/auth/schema";
import type { Principal } from "../../src/modules/auth/dev-auth";
import {
  branches,
  nodeChangeProposals,
  nodePublicationProposals,
  treeNodes,
  treeNodeVersions,
  vaultGrants,
} from "../../src/modules/knowledge/schema";
import {
  createNode,
  decideNodePublication,
  reviewNodeProposal,
  submitNodePublication,
  updateNode,
} from "../../src/modules/knowledge/service";
import {
  contentReviews,
  curations,
  sources,
  sourceVersions,
} from "../../src/modules/storage/schema";
import { publishFromSource } from "../../src/modules/storage/curation";

async function principal(email: string): Promise<Principal> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  assert.ok(user);
  const grants = await db.select().from(vaultGrants).where(eq(vaultGrants.userId, user.id));
  return {
    userId: user.id,
    role: user.role,
    spaceIds: [],
    spaceMemberships: [],
    capabilities: [],
    vaultIds: grants.map((grant) => grant.vaultId),
    vaultGrants: grants.map((grant) => ({ vaultId: grant.vaultId, grant: grant.grant })),
  };
}

export async function run() {
  const editor = await principal("minh@wisdomtree.local");
  const reviewer = await principal("huong@wisdomtree.local");
  reviewer.capabilities = ["content.review"];

  const [sharedNode] = await db
    .select({ node: treeNodes, vaultId: branches.vaultId })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(branches.scope, "team"))
    .limit(1);
  assert.ok(sharedNode);
  const proposed = await updateNode(editor, sharedNode.node.id, {
    contentMd: `${sharedNode.node.contentMd}\n\nMaker-checker test.`,
    expectedVersion: sharedNode.node.version,
  });
  assert.ok("proposalId" in proposed);
  const [review] = await db
    .select()
    .from(contentReviews)
    .where(eq(contentReviews.proposalId, proposed.proposalId));
  assert.ok(review);

  await assert.rejects(
    reviewNodeProposal(
      {
        ...editor,
        capabilities: ["content.review"],
        vaultGrants: [{ vaultId: sharedNode.vaultId, grant: "reviewer" }],
      },
      sharedNode.node.id,
      proposed.proposalId,
      { decision: "approved", verification: "verified", expectedReviewVersion: review.version },
    ),
    /Người tạo hoặc sửa không được tự duyệt/,
  );
  await reviewNodeProposal(reviewer, sharedNode.node.id, proposed.proposalId, {
    decision: "approved",
    verification: "verified",
    expectedReviewVersion: review.version,
  });
  const [approvedVersion] = await db
    .select()
    .from(treeNodeVersions)
    .where(
      and(
        eq(treeNodeVersions.nodeId, sharedNode.node.id),
        eq(treeNodeVersions.reviewStatus, "approved"),
      ),
    );
  assert.ok(approvedVersion);
  const [proposal] = await db
    .select()
    .from(nodeChangeProposals)
    .where(eq(nodeChangeProposals.id, proposed.proposalId));
  assert.equal(proposal.state, "approved");

  const [ready] = await db
    .select({ source: sources, version: sourceVersions, curation: curations })
    .from(curations)
    .innerJoin(sourceVersions, eq(sourceVersions.id, curations.sourceVersionId))
    .innerJoin(sources, eq(sources.id, sourceVersions.sourceId))
    .where(eq(curations.state, "ready_for_review"));
  const [targetBranch] = await db
    .select()
    .from(branches)
    .where(eq(branches.vaultId, sharedNode.vaultId))
    .limit(1);
  assert.ok(targetBranch);
  // The seeded ready item is consumed by the first successful run. Keep the
  // integration suite repeatable while still exercising source publication
  // whenever that fixture is available.
  if (ready) {
    reviewer.spaceIds = [ready.source.spaceId];
    reviewer.spaceMemberships = [{ spaceId: ready.source.spaceId, role: "viewer" }];
    const published = await publishFromSource(reviewer, ready.source.id, ready.version.id, {
      branchId: targetBranch.id,
      verification: "verified",
    });
    assert.equal(published.createdBy, ready.source.submittedBy);
  }

  const user = await principal("lan@wisdomtree.local");
  await assert.rejects(
    createNode(user, {
      branchId: targetBranch.id,
      title: "Counterfeit",
      contentMd: "must not be created directly",
    }),
    /Nội dung chung phải đi qua maker-checker review/,
  );

  const [personalBranch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.scope, "personal"), eq(branches.ownerUserId, user.userId)))
    .limit(1);
  assert.ok(personalBranch);
  const personalNode = await createNode(user, {
    branchId: personalBranch.id,
    title: `Personal publication ${Date.now()}`,
    contentMd: "Personal snapshot for independent review.",
  });
  const submitted = await submitNodePublication(user, personalNode.id, targetBranch.id);
  const [publicationReview] = await db
    .select()
    .from(contentReviews)
    .where(eq(contentReviews.publicationProposalId, submitted.proposalId));
  assert.ok(publicationReview);

  await assert.rejects(
    decideNodePublication(
      {
        ...user,
        capabilities: ["content.review"],
        vaultGrants: [{ vaultId: sharedNode.vaultId, grant: "reviewer" }],
      },
      submitted.reviewTaskId,
      {
        decision: "approved",
        verification: "unverified",
        expectedReviewVersion: publicationReview.version,
      },
    ),
    /Người tạo hoặc sửa không được tự duyệt/,
  );
  await assert.rejects(
    decideNodePublication(reviewer, submitted.reviewTaskId, {
      decision: "approved",
      verification: "verified",
      expectedReviewVersion: publicationReview.version,
    }),
    /không có tư liệu nguồn/,
  );
  const commonNode = await decideNodePublication(reviewer, submitted.reviewTaskId, {
    decision: "approved",
    verification: "unverified",
    expectedReviewVersion: publicationReview.version,
  });
  assert.ok("branchId" in commonNode);
  assert.equal(commonNode.branchId, targetBranch.id);
  assert.equal(commonNode.createdBy, user.userId);
  const [approvedPublication] = await db
    .select()
    .from(nodePublicationProposals)
    .where(eq(nodePublicationProposals.id, submitted.proposalId));
  assert.equal(approvedPublication?.state, "approved");

  const staleNode = await createNode(user, {
    branchId: personalBranch.id,
    title: `Stale publication ${Date.now()}`,
    contentMd: "First snapshot.",
  });
  const staleSubmission = await submitNodePublication(user, staleNode.id, targetBranch.id);
  const [staleReview] = await db
    .select()
    .from(contentReviews)
    .where(eq(contentReviews.publicationProposalId, staleSubmission.proposalId));
  assert.ok(staleReview);
  await updateNode(user, staleNode.id, {
    contentMd: "Changed after submission.",
    expectedVersion: staleNode.version,
  });
  await assert.rejects(
    decideNodePublication(reviewer, staleSubmission.reviewTaskId, {
      decision: "approved",
      verification: "unverified",
      expectedReviewVersion: staleReview.version,
    }),
    /đã thay đổi sau khi gửi duyệt/,
  );
  const changes = await decideNodePublication(reviewer, staleSubmission.reviewTaskId, {
    decision: "changes_requested",
    expectedReviewVersion: staleReview.version,
    note: "Gửi lại snapshot mới.",
  });
  assert.ok("state" in changes);
  assert.equal(changes.state, "changes_requested");
}
