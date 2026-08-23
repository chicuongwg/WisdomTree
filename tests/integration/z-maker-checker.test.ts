import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { db } from "../../src/db";
import { users } from "../../src/modules/auth/schema";
import type { Principal } from "../../src/modules/auth/principal";
import {
  branches,
  nodeChangeProposals,
  nodePublicationProposals,
  treeNodes,
  treeNodeVersions,
} from "../../src/modules/knowledge/schema";
import {
  createNode,
  decideNodePublication,
  listPendingProposals,
  proposeNodeChange,
  reviewNodeProposal,
  submitNodePublication,
  updateNode,
} from "../../src/modules/knowledge/service";

// The two surviving review boundaries of the two-tier model:
//   1. a change to a promoted (team-scope) node needs an independent reviewer;
//   2. promoting a personal node onto a team branch needs one too.
// Everything else — personal-branch edits — saves live and is covered by the
// direct updateNode path below.

async function principal(email: string): Promise<Principal> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  assert.ok(user);
  return {
    userId: user.id,
    role: user.role,
    spaceIds: [],
    spaceMemberships: [],
  };
}

export async function run() {
  const editor = await principal("minh@wisdomtree.local");
  const reviewer = await principal("huong@wisdomtree.local");

  const [sharedNode] = await db
    .select({ node: treeNodes })
    .from(treeNodes)
    .innerJoin(branches, eq(branches.id, treeNodes.branchId))
    .where(eq(branches.scope, "team"))
    .limit(1);
  assert.ok(sharedNode);

  // Boundary 1: a promoted node refuses in-place saves…
  await assert.rejects(
    updateNode(editor, sharedNode.node.id, {
      contentMd: `${sharedNode.node.contentMd}\n\nDirect save.`,
      expectedVersion: sharedNode.node.version,
    }),
    /only changes through an approved proposal/,
  );
  // …changes go through a proposal…
  const proposed = await proposeNodeChange(editor, sharedNode.node.id, {
    contentMd: `${sharedNode.node.contentMd}\n\nMaker-checker test.`,
    expectedVersion: sharedNode.node.version,
  });
  assert.equal(proposed.state, "pending");
  // …the proposer cannot approve their own change…
  await assert.rejects(
    reviewNodeProposal(
      editor,
      sharedNode.node.id,
      proposed.proposalId,
      { decision: "approved", verification: "verified" },
    ),
    /cannot review their own change/,
  );
  // …and it appears on the review surface.
  const pending = await listPendingProposals(reviewer);
  assert.equal(pending.changes.some((c) => c.id === proposed.proposalId), true);

  await reviewNodeProposal(reviewer, sharedNode.node.id, proposed.proposalId, {
    decision: "approved",
    verification: "verified",
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
  // A decided proposal cannot be decided again.
  await assert.rejects(
    reviewNodeProposal(reviewer, sharedNode.node.id, proposed.proposalId, {
      decision: "rejected",
    }),
  );

  const [targetBranch] = await db
    .select()
    .from(branches)
    .where(eq(branches.scope, "team"))
    .limit(1);
  assert.ok(targetBranch);

  const user = await principal("lan@wisdomtree.local");
  await assert.rejects(
    createNode(user, {
      branchId: targetBranch.id,
      title: "Counterfeit",
      contentMd: "must not be created directly",
    }),
    /must go through review/,
  );

  // Boundary 2: promotion of a personal node.
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
  assert.equal(submitted.state, "pending");

  // A plain member has no review role at all — the gate refuses before the
  // separation rule is even consulted.
  await assert.rejects(
    decideNodePublication(
      user,
      submitted.proposalId,
      { decision: "approved", verification: "unverified" },
    ),
    /Access denied/,
  );
  await assert.rejects(
    decideNodePublication(reviewer, submitted.proposalId, {
      decision: "approved",
      verification: "verified",
    }),
    /without a source/,
  );
  const commonNode = await decideNodePublication(reviewer, submitted.proposalId, {
    decision: "approved",
    verification: "unverified",
  });
  assert.ok("branchId" in commonNode);
  assert.equal(commonNode.branchId, targetBranch.id);
  assert.equal(commonNode.createdBy, user.userId);
  const [approvedPublication] = await db
    .select()
    .from(nodePublicationProposals)
    .where(eq(nodePublicationProposals.id, submitted.proposalId));
  assert.equal(approvedPublication?.state, "approved");
  assert.equal(approvedPublication?.decidedBy, reviewer.userId);

  // Stale guard: the personal node changed after submission (live edit).
  const staleNode = await createNode(user, {
    branchId: personalBranch.id,
    title: `Stale publication ${Date.now()}`,
    contentMd: "First snapshot.",
  });
  const staleSubmission = await submitNodePublication(user, staleNode.id, targetBranch.id);
  await updateNode(user, staleNode.id, {
    contentMd: "Changed after submission.",
    expectedVersion: staleNode.version,
  });
  await assert.rejects(
    decideNodePublication(reviewer, staleSubmission.proposalId, {
      decision: "approved",
      verification: "unverified",
    }),
    /changed after submission/,
  );
  const changes = await decideNodePublication(reviewer, staleSubmission.proposalId, {
    decision: "changes_requested",
    note: "Gửi lại snapshot mới.",
  });
  assert.ok("state" in changes);
  assert.equal(changes.state, "changes_requested");

  // Separation of duties on promotion: an editor CAN review, but never their
  // own submission.
  const [editorBranch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.scope, "personal"), eq(branches.ownerUserId, editor.userId)))
    .limit(1);
  assert.ok(editorBranch);
  const editorNode = await createNode(editor, {
    branchId: editorBranch.id,
    title: `Editor publication ${Date.now()}`,
    contentMd: "Editor snapshot.",
  });
  const editorSubmission = await submitNodePublication(editor, editorNode.id, targetBranch.id);
  await assert.rejects(
    decideNodePublication(editor, editorSubmission.proposalId, {
      decision: "approved",
      verification: "unverified",
    }),
    /cannot review their own change/,
  );
  await decideNodePublication(reviewer, editorSubmission.proposalId, {
    decision: "approved",
    verification: "unverified",
  });
}
