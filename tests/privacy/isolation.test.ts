import assert from "node:assert/strict";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { spaces, sources } from "@/modules/storage/schema";
import { branches, treeNodes } from "@/modules/knowledge/schema";
import { getDownloadToken, getSourceDetail, listLibrary } from "@/modules/storage/service";
import {
  createNode,
  getNode,
  getNodeTranslation,
  listPendingTranslations,
  saveNodeTranslation,
  listBranches,
  listNodeVersions,
  searchTree,
  searchKnowledge,
  treeOutline,
  updateNode,
  wikiIndex,
} from "@/modules/knowledge/service";
import { createGraphProvider } from "@/modules/knowledge/graph-provider";
import { ApiError } from "@/lib/errors";
import { principalFor } from "../setup";

// PRIVACY — data isolation. Two boundaries, each tested from the outside:
//   Spaces: a member outside a space must not see its files — and must not
//   even learn they exist (404, never 403, on out-of-scope reads).
//   Personal vaults: one member's private notes are invisible to another
//   member on every read surface (detail, lists, search, wiki, graph,
//   history) and untouchable on the write surface.

const notFound404 = (err: unknown) => {
  assert.ok(err instanceof ApiError, "must be an ApiError");
  assert.equal(err.status, 404, "out-of-scope reads must 404, never 403");
  assert.equal(err.code, "not_found");
  return true;
};

export async function run() {
  const lan = await principalFor("lan@wisdomtree.local"); // library only
  const duc = await principalFor("duc@wisdomtree.local"); // library only
  const minh = await principalFor("minh@wisdomtree.local"); // restricted-space editor

  // --- Space isolation -----------------------------------------------------
  const [restricted] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Kho Dự Án Cộng Đồng")); // minh + huong only
  assert.ok(restricted);
  assert.ok(!lan.spaceIds.includes(restricted.id), "seed premise: lan is outside this space");
  const [hidden] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.spaceId, restricted.id))
    .limit(1);
  assert.ok(hidden, "seed premise: the restricted space holds at least one source");
  const [hiddenBranch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.scope, "team"), eq(branches.spaceId, restricted.id)))
    .limit(1);
  assert.ok(hiddenBranch, "seed premise: the restricted space holds a knowledge branch");
  const [hiddenNode] = await db
    .select({ id: treeNodes.id, title: treeNodes.title })
    .from(treeNodes)
    .where(eq(treeNodes.branchId, hiddenBranch.id))
    .limit(1);
  assert.ok(hiddenNode, "seed premise: the restricted branch holds a node");
  const hiddenTranslation = await saveNodeTranslation(minh, hiddenNode.id, "en", {
    title: `Hidden translation ${Date.now()}`,
    contentMd: "Private to the restricted space.",
    expectedVersion: 0,
  });
  assert.equal(hiddenTranslation.state, "pending");

  // Detail and download both answer 404 — indistinguishable from "no such id".
  await assert.rejects(getSourceDetail(lan, hidden.id), notFound404);
  await assert.rejects(getDownloadToken(lan, hidden.id), notFound404);

  // Lists never include it — unfiltered, and even when asked for directly.
  const library = await listLibrary(lan, {});
  assert.ok(library.every((item) => item.spaceId !== restricted.id));
  await assert.rejects(
    listLibrary(lan, { spaceId: restricted.id }),
    notFound404,
    "asking for the space by id must read as not-found",
  );

  // Knowledge uses the same space boundary on every read surface.
  await assert.rejects(getNode(lan, hiddenNode.id), notFound404);
  await assert.rejects(getNodeTranslation(lan, hiddenNode.id, "en"), notFound404);
  await assert.rejects(listNodeVersions(lan, hiddenNode.id), notFound404);
  const lanBranches = await listBranches(lan);
  assert.ok(lanBranches.every((branch) => branch.id !== hiddenBranch.id));
  const lanTeamOutline = await treeOutline(lan);
  assert.ok(lanTeamOutline.team.every((branch) => branch.id !== hiddenBranch.id));
  const hiddenHits = await searchTree(lan, hiddenNode.title);
  assert.ok(hiddenHits.every((node) => node.id !== hiddenNode.id));
  const lanWiki = await wikiIndex(lan);
  assert.ok(Object.values(lanWiki).every((node) => node.id !== hiddenNode.id));
  const lanGraph = await createGraphProvider(lan).loadGraph({ scope: "shared" });
  assert.ok(lanGraph.nodes.every((node) => node.id !== hiddenNode.id));
  const unifiedHits = await searchKnowledge(lan, hiddenNode.title);
  assert.ok(unifiedHits.every((result) => result.id !== hiddenNode.id && result.id !== hidden.id));
  const outsideEditor = { ...lan, role: "editor" as const };
  assert.ok((await listPendingTranslations(outsideEditor)).every((proposal) => proposal.nodeId !== hiddenNode.id));

  // --- Personal-vault isolation -------------------------------------------
  const [lanBranch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.scope, "personal"), eq(branches.ownerUserId, lan.userId)))
    .limit(1);
  assert.ok(lanBranch);
  const secret = await createNode(lan, {
    branchId: lanBranch.id,
    title: `Ghi chú riêng tư ${Date.now()}`,
    contentMd: "Chỉ của Lan.",
  });
  await assert.rejects(
    createNode(lan, {
      branchId: lanBranch.id,
      title: `Liên kết ngoài phạm vi ${Date.now()}`,
      contentMd: "Không được lưu target ẩn.",
      links: [{ toNodeId: hiddenNode.id, linkType: "supports" }],
    }),
    (err: unknown) => err instanceof ApiError && err.code === "invalid_link_target",
  );

  // Another member: node detail and history are 404.
  await assert.rejects(getNode(duc, secret.id), notFound404);
  await assert.rejects(listNodeVersions(duc, secret.id), notFound404);

  // …and every listing surface omits both the branch and the node.
  const ducBranches = await listBranches(duc);
  assert.ok(ducBranches.every((b) => b.id !== lanBranch.id));
  const outline = await treeOutline(duc);
  assert.ok(outline.personal.every((b) => b.id !== lanBranch.id));
  const hits = await searchTree(duc, "Ghi chú riêng tư");
  assert.ok(hits.every((h) => h.id !== secret.id));
  const wiki = await wikiIndex(duc);
  assert.ok(Object.values(wiki).every((entry) => entry.id !== secret.id));
  for (const scope of ["shared", "personal"] as const) {
    const graph = await createGraphProvider(duc).loadGraph({ scope });
    assert.ok(graph.nodes.every((n) => n.id !== secret.id));
  }

  // Writes from outside are refused too (the author, of course, still saves).
  await assert.rejects(
    updateNode(duc, secret.id, { contentMd: "đọc trộm", expectedVersion: secret.version }),
    (err: unknown) => err instanceof ApiError && err.status >= 403,
  );
  const ok = await updateNode(lan, secret.id, {
    contentMd: "Vẫn chỉ của Lan.",
    expectedVersion: secret.version,
  });
  assert.ok("version" in ok);

  // The owner sees their own branch everywhere the outsider saw nothing.
  const lanOutline = await treeOutline(lan);
  assert.ok(lanOutline.personal.some((b) => b.id === lanBranch.id));

  // Sanity: nothing in the shared surfaces references lan's personal vault
  // by accident (the whole visible node set for duc excludes it).
  const ducVisible = await db
    .select({ id: branches.id })
    .from(branches)
    .where(inArray(branches.id, ducBranches.map((b) => b.id).concat("00000000-0000-0000-0000-000000000000")));
  assert.ok(ducVisible.every((b) => b.id !== lanBranch.id));
}
