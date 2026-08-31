import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import {
  createBranch,
  createTeamDraft,
  getMyNodeDraft,
  publishDraft,
  rebaseDraft,
  reviewNodeProposal,
  saveNodeDraft,
  setNodeProtection,
  submitDraftForReview,
} from "@/modules/knowledge/service";
import { nodeDrafts, treeNodes } from "@/modules/knowledge/schema";
import { spaces } from "@/modules/storage/schema";
import { principalFor } from "../setup";

const snapshot = (title: string, contentMd = `# ${title}`) => ({
  title,
  summary: null,
  sortOrder: 0,
  contentMd,
  tags: [],
  links: [],
});

export async function run() {
  const member = await principalFor("lan@wisdomtree.local");
  const admin = await principalFor("huong@wisdomtree.local");
  const [space] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Thư Viện Cộng Đồng"));
  const branch = await createBranch(admin, {
    name: `Draft integration ${Date.now()}`,
    scope: "team",
    spaceId: space.id,
  });

  const title = `Trang draft ${Date.now()}`;
  const fresh = await createTeamDraft(member, { branchId: branch.id, ...snapshot(title) });
  const published = await publishDraft(member, fresh.id);
  const [node] = await db.select().from(treeNodes).where(eq(treeNodes.id, published.nodeId));
  assert.equal(node.verification, "unverified");
  assert.equal(node.publish, false);
  assert.equal((await db.select().from(nodeDrafts).where(eq(nodeDrafts.id, fresh.id))).length, 0);

  const initial = await getMyNodeDraft(member, node.id, "vi");
  const first = await saveNodeDraft(member, node.id, "vi", {
    ...snapshot(title, `# ${title}\n\nA`),
    baseVersion: initial.officialVersion,
    expectedDraftVersion: 0,
  });
  const second = await saveNodeDraft(member, node.id, "vi", {
    ...snapshot(title, `# ${title}\n\nB`),
    baseVersion: initial.officialVersion,
    expectedDraftVersion: first.draftVersion,
  });
  await assert.rejects(
    saveNodeDraft(member, node.id, "vi", {
      ...snapshot(title, `# ${title}\n\nC`),
      baseVersion: initial.officialVersion,
      expectedDraftVersion: first.draftVersion,
    }),
    (error: unknown) => error instanceof ApiError && error.code === "draft_version_conflict",
  );
  assert.equal(second.draftVersion, 2);

  await setNodeProtection(admin, node.id, true);
  const rebased = await rebaseDraft(member, second.id, {
    ...snapshot(title, `# ${title}\n\nB`),
    expectedOfficialVersion: initial.officialVersion + 1,
    expectedDraftVersion: second.draftVersion,
  });
  await assert.rejects(
    publishDraft(member, rebased.id),
    (error: unknown) => error instanceof ApiError && error.code === "protected_review_required",
  );
  const submitted = await submitDraftForReview(member, rebased.id);
  assert.equal(submitted.state, "in_review");
  const [reviewDraft] = await db
    .select()
    .from(nodeDrafts)
    .where(and(eq(nodeDrafts.id, rebased.id), eq(nodeDrafts.state, "in_review")));
  assert.equal(reviewDraft.submittedProposalId, submitted.proposalId);
  const approved = await reviewNodeProposal(admin, node.id, submitted.proposalId, {
    decision: "approved",
    verification: "unverified",
  });
  assert.ok("contentMd" in approved);
  assert.match(approved.contentMd, /B$/);
  assert.equal((await db.select().from(nodeDrafts).where(eq(nodeDrafts.id, rebased.id))).length, 0);

  const afterApproval = await getMyNodeDraft(member, node.id, "vi");
  const revise = await saveNodeDraft(member, node.id, "vi", {
    ...snapshot(title, `# ${title}\n\nCần sửa`),
    baseVersion: afterApproval.officialVersion,
    expectedDraftVersion: 0,
  });
  const revisionReview = await submitDraftForReview(member, revise.id);
  await reviewNodeProposal(admin, node.id, revisionReview.proposalId, {
    decision: "changes_requested",
  });
  assert.equal(
    (await db.select().from(nodeDrafts).where(eq(nodeDrafts.id, revise.id)))[0].state,
    "editing",
  );

  const duplicate = await createTeamDraft(member, { branchId: branch.id, ...snapshot(title) });
  await assert.rejects(
    publishDraft(member, duplicate.id),
    (error: unknown) => error instanceof ApiError && error.code === "duplicate_wiki_title",
  );
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
