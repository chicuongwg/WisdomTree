import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import {
  createNode,
  createProjectNote,
  getDraft,
  getNode,
  listProjectNotes,
  publishDraft,
  updateDraft,
} from "@/modules/knowledge/service";
import { branches, nodeDrafts, treeNodes, treeNodeVersions } from "@/modules/knowledge/schema";
import { createProject } from "@/modules/project/service";
import { spaces } from "@/modules/storage/schema";
import { addSpaceMember } from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const initialAdmin = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("minh@wisdomtree.local");
  const viewerUser = await principalFor("lan@wisdomtree.local");
  const outsider = await principalFor("duc@wisdomtree.local");
  const [legacyTeam] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Kho Dự Án Cộng Đồng"));
  const [personalSpace] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.type, "personal"));
  assert.ok(legacyTeam);
  assert.ok(personalSpace);

  const demoNodes = await db.select({ id: treeNodes.id }).from(treeNodes);
  assert.ok(demoNodes.length > 0);
  assert.equal(
    await db
      .select({ id: treeNodes.id })
      .from(treeNodes)
      .where(isNull(treeNodes.projectId))
      .then((rows) => rows.length),
    demoNodes.length,
  );

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const projectA = await createProject(initialAdmin, {
    name: `Note Project A ${suffix}`,
    researchLens: "Project Note ownership and private working state",
  });
  const projectB = await createProject(initialAdmin, {
    name: `Note Project B ${suffix}`,
    researchLens: "Cross-Project Note isolation",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(manager, projectA.id, contributorUser.userId, "contributor");
  await addSpaceMember(manager, projectA.id, viewerUser.userId, "viewer");
  const contributor = await principalFor("minh@wisdomtree.local");
  const viewer = await principalFor("lan@wisdomtree.local");

  const draft = await createProjectNote(contributor, {
    projectId: projectA.id,
    title: " Field observation ",
    contentMd: "# Field observation\n\nWorking evidence.",
    summary: " Private working summary ",
    tags: ["field", " field "],
  });
  assert.equal(draft.projectId, projectA.id);
  assert.equal(draft.authorId, contributor.userId);
  assert.equal(draft.workingVisibility, "author_private");
  assert.equal(draft.title, "Field observation");
  assert.deepEqual(draft.tags, ["field"]);
  const [compatibilityBranch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, draft.branchId));
  assert.equal(compatibilityBranch.scope, "team");
  assert.equal(compatibilityBranch.spaceId, projectA.id);

  assert.equal((await getDraft(contributor, draft.id)).id, draft.id);
  await assert.rejects(getDraft(manager, draft.id), errorCode("not_found"));
  const authorWorkingList = await listProjectNotes(contributor, projectA.id);
  assert.ok(authorWorkingList.drafts.some((item) => item.id === draft.id));
  assert.ok(authorWorkingList.notes.every((item) => item.projectId === projectA.id));
  const viewerWorkingList = await listProjectNotes(viewer, projectA.id);
  assert.ok(viewerWorkingList.drafts.every((item) => item.id !== draft.id));
  await assert.rejects(listProjectNotes(outsider, projectA.id), errorCode("not_found"));

  const saved = await updateDraft(contributor, draft.id, {
    title: draft.title,
    summary: draft.summary,
    sortOrder: draft.sortOrder,
    contentMd: `${draft.contentMd}\n\nSecond pass.`,
    tags: draft.tags,
    links: draft.links,
    expectedDraftVersion: draft.draftVersion,
  });
  assert.equal(saved.projectId, projectA.id);
  assert.equal(saved.draftVersion, draft.draftVersion + 1);

  await assert.rejects(
    createProjectNote(viewer, {
      projectId: projectA.id,
      title: "Viewer cannot create",
      contentMd: "No write permission.",
    }),
    errorCode("forbidden"),
  );
  await assert.rejects(
    createProjectNote(contributor, { title: "Missing Project", contentMd: "Missing." }),
    errorCode("invalid_project_note"),
  );
  for (const invalidProjectId of [randomUUID(), legacyTeam.id, personalSpace.id]) {
    await assert.rejects(
      createProjectNote(contributor, {
        projectId: invalidProjectId,
        title: "Invalid Project",
        contentMd: "Invalid.",
      }),
      errorCode("not_found"),
    );
  }

  const otherDraft = await createProjectNote(manager, {
    projectId: projectB.id,
    title: "Other Project Note",
    contentMd: "Separate Project.",
  });
  const [otherBranch] = await db.select().from(branches).where(eq(branches.id, otherDraft.branchId));
  const otherPublished = await publishDraft(manager, otherDraft.id);

  // The caller cannot select Branch ownership; extra compatibility input is ignored.
  const noBranchChoice = await createProjectNote(contributor, {
    projectId: projectA.id,
    title: "Project chooses context",
    contentMd: "No Branch choice.",
    branchId: otherBranch.id,
  } as Parameters<typeof createProjectNote>[1] & { branchId: string });
  assert.equal(noBranchChoice.branchId, compatibilityBranch.id);

  // Database triggers close both conflicting ownership directions.
  await assert.rejects(
    db.insert(treeNodes).values({
      branchId: otherBranch.id,
      projectId: projectA.id,
      title: "Cross-Project conflict",
      slug: `cross-project-${suffix}`,
      contentMd: "Conflict.",
      verification: "unverified",
      createdBy: contributor.userId,
    }),
  );
  const [personalBranch] = await db
    .select()
    .from(branches)
    .where(and(eq(branches.scope, "personal"), eq(branches.ownerUserId, viewer.userId)));
  assert.ok(personalBranch);
  await assert.rejects(
    db.insert(nodeDrafts).values({
      branchId: personalBranch.id,
      projectId: projectA.id,
      authorId: viewer.userId,
      title: "Personal Branch conflict",
      contentMd: "Conflict.",
    }),
  );
  await assert.rejects(
    db.update(branches).set({ spaceId: projectB.id }).where(eq(branches.id, compatibilityBranch.id)),
  );

  const published = await publishDraft(contributor, draft.id);
  const [note] = await db.select().from(treeNodes).where(eq(treeNodes.id, published.nodeId));
  assert.equal(note.projectId, projectA.id);
  assert.equal(note.createdBy, contributor.userId);
  await assert.rejects(
    db.insert(nodeDrafts).values({
      nodeId: note.id,
      branchId: otherBranch.id,
      projectId: projectB.id,
      authorId: manager.userId,
      title: "Draft Project conflict",
      contentMd: "Conflict.",
    }),
  );
  assert.equal(
    await db
      .select({ id: treeNodeVersions.id })
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, note.id))
      .then((rows) => rows.length),
    1,
  );
  assert.equal(
    await db
      .select({ id: nodeDrafts.id })
      .from(nodeDrafts)
      .where(eq(nodeDrafts.id, draft.id))
      .then((rows) => rows.length),
    0,
  );
  const viewerPublishedList = await listProjectNotes(viewer, projectA.id);
  assert.ok(viewerPublishedList.notes.some((item) => item.id === note.id));
  assert.ok(viewerPublishedList.notes.every((item) => item.projectId === projectA.id));
  assert.ok(viewerPublishedList.notes.every((item) => !demoNodes.some((demo) => demo.id === item.id)));
  assert.ok(viewerPublishedList.notes.every((item) => item.id !== otherPublished.nodeId));

  // Existing Personal Node behavior remains owner-only and Project-less.
  const personalNode = await createNode(viewer, {
    branchId: personalBranch.id,
    title: `Legacy personal compatibility ${suffix}`,
    contentMd: "Owner-only demo compatibility.",
  });
  assert.equal(personalNode.projectId, null);
  assert.equal((await getNode(viewer, personalNode.id)).id, personalNode.id);
  await assert.rejects(getNode(outsider, personalNode.id), errorCode("not_found"));
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
