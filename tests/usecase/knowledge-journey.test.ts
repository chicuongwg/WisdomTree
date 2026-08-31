import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { branches, treeNodes } from "@/modules/knowledge/schema";
import {
  createBranch,
  createNode,
  decideNodePublication,
  getNode,
  getBranch,
  getNodeVersion,
  listNodeVersions,
  proposeNodeChange,
  reviewNodeProposal,
  searchTree,
  submitNodePublication,
  updateNode,
  updateBranch,
  wikiIndex,
} from "@/modules/knowledge/service";
import { spaces } from "@/modules/storage/schema";
import { createGraphProvider } from "@/modules/knowledge/graph-provider";
import { diffLines } from "@/lib/diff";
import { principalFor } from "../setup";

// USE CASE — the knowledge lifecycle, end to end at the service layer:
// a member writes and live-edits a personal note (with history, diff and
// restore), promotes it through the single review boundary, the promoted
// page becomes part of the shared tree (search, wiki links, graph), and a
// later change to it travels as a reviewed proposal.

export async function run() {
  const lan = await principalFor("lan@wisdomtree.local"); // member (author)
  const minh = await principalFor("minh@wisdomtree.local"); // editor
  const huong = await principalFor("huong@wisdomtree.local"); // admin (reviewer)

  // 1. Write a personal note. It enters as no_source and is live-editable.
  const [personalBranch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.scope, "personal"), eq(branches.ownerUserId, lan.userId)))
    .limit(1);
  assert.ok(personalBranch);
  const title = `Nghề đan lát ${Date.now()}`;
  const node = await createNode(lan, {
    branchId: personalBranch.id,
    title,
    summary: "Tóm tắt kiểm thử.",
    sortOrder: 20,
    contentMd: "# Ghi chú đầu tiên\n\nBản nháp.",
    tags: ["nghề thủ công"],
  });
  assert.equal(node.verification, "no_source");

  // 2. Live edit twice — each save appends a version, no review anywhere.
  const v2 = await updateNode(lan, node.id, {
    contentMd: "# Ghi chú đầu tiên\n\nBản nháp có thêm chi tiết.",
    expectedVersion: node.version,
  });
  assert.ok("version" in v2);
  await updateNode(lan, node.id, {
    contentMd: "# Ghi chú đầu tiên\n\nBản gần hoàn chỉnh.",
    expectedVersion: v2.version,
  });

  // 3. History: three versions, diffable, restorable by appending.
  const history = await listNodeVersions(lan, node.id);
  assert.equal(history.versions.length, 3);
  assert.equal(history.versions[0].seq, 3); // newest first
  const [old1, new3] = await Promise.all([
    getNodeVersion(lan, node.id, 1),
    getNodeVersion(lan, node.id, 3),
  ]);
  assert.ok(diffLines(old1.contentMd, new3.contentMd).some((op) => op.kind !== "same"));
  const restored = await updateNode(lan, node.id, {
    contentMd: old1.contentMd,
    expectedVersion: history.node.version,
  });
  assert.ok("version" in restored);
  assert.equal((await listNodeVersions(lan, node.id)).versions.length, 4, "restore appends");

  // 4. Promote through the single review boundary: the submitter cannot be
  // the decider; an independent reviewer approves it onto a team branch.
  const [sharedSpace] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(and(eq(spaces.type, "team"), inArray(spaces.id, lan.spaceIds)))
    .limit(1);
  assert.ok(sharedSpace);
  const teamBranch = await createBranch(huong, {
    name: `Chuyên đề kiểm thử ${Date.now()}`,
    scope: "team",
    spaceId: sharedSpace.id,
  });
  const parentBranch = await createBranch(huong, {
    name: `Nhóm kiểm thử ${Date.now()}`,
    scope: "team",
    spaceId: sharedSpace.id,
    sortOrder: 10,
  });
  const nestedBranch = await updateBranch(huong, teamBranch.id, {
    parentId: parentBranch.id,
    sortOrder: 20,
    expectedVersion: teamBranch.version,
  });
  assert.equal((await getBranch(lan, nestedBranch.id)).parentId, parentBranch.id);
  await assert.rejects(
    updateBranch(huong, parentBranch.id, {
      parentId: nestedBranch.id,
      expectedVersion: parentBranch.version,
    }),
    (error: unknown) => error instanceof Error && error.message.includes("cycle"),
  );
  const submission = await submitNodePublication(lan, node.id, teamBranch.id);
  const promoted = await decideNodePublication(huong, submission.proposalId, {
    decision: "approved",
    verification: "unverified", // no source file behind it
  });
  assert.ok("branchId" in promoted);
  assert.equal(promoted.branchId, teamBranch.id);
  assert.equal(promoted.createdBy, lan.userId, "authorship survives promotion");
  assert.equal(promoted.summary, "Tóm tắt kiểm thử.");
  assert.equal(promoted.sortOrder, 20);

  // 5. The promoted page is part of the shared tree. Its author can trace the
  // private origin; other members can find the shared page without learning
  // that private node id.
  const authorRead = await getNode(lan, promoted.id);
  assert.equal(authorRead.personalOrigins[0]?.sourceNodeId, node.id);
  const read = await getNode(minh, promoted.id);
  assert.equal(read.personalOrigins.length, 0);
  const hits = await searchTree(minh, title.split(" ")[0]);
  assert.ok(hits.some((h) => h.id === promoted.id));
  const wiki = await wikiIndex(minh);
  assert.ok(Object.values(wiki).some((entry) => entry.id === promoted.id));
  const graph = await createGraphProvider(minh).loadGraph({ scope: "shared" });
  assert.ok(graph.nodes.some((n) => n.id === promoted.id));

  // 6. The promoted page is LOCKED: even its author cannot save in place.
  await assert.rejects(
    updateNode(lan, promoted.id, {
      contentMd: "sửa thẳng",
      expectedVersion: promoted.version,
    }),
  );

  // 7. A change travels as a proposal from an editor-author, decided by
  // someone else, and the applied text becomes the page.
  const [minhTeamNode] = await db
    .select()
    .from(treeNodes)
    .innerJoin(branches, eq(treeNodes.branchId, branches.id))
    .where(and(eq(branches.scope, "team"), eq(treeNodes.createdBy, minh.userId)))
    .limit(1);
  assert.ok(minhTeamNode, "seed provides a team node authored by the editor");
  const target = minhTeamNode.tree_nodes;
  const proposal = await proposeNodeChange(minh, target.id, {
    contentMd: `${target.contentMd}\n\nBổ sung ${Date.now()}.`,
    expectedVersion: target.version,
  });
  const applied = await reviewNodeProposal(huong, target.id, proposal.proposalId, {
    decision: "approved",
    verification: "verified",
  });
  assert.ok("contentMd" in applied);
  assert.match(applied.contentMd, /Bổ sung/);
}
