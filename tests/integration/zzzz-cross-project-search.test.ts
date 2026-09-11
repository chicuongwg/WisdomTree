import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { inviteUser } from "@/modules/auth/admin";
import { grantTmktCore, revokeTmktCore } from "@/modules/auth/core";
import {
  createBranch,
  createNode,
  createProjectNote,
  createTeamDraft,
  publishDraft,
  saveNodeDraft,
} from "@/modules/knowledge/service";
import { attachPersonToProject, createProjectPerson } from "@/modules/person/service";
import { publishNote, unpublishNote } from "@/modules/publication/service";
import { notePublicRevisions } from "@/modules/publication/schema";
import { createProject } from "@/modules/project/service";
import { createProjectActivity } from "@/modules/activity/service";
import { searchInternalResearch, searchPublishedNotes } from "@/modules/search/service";
import { sources, spaces } from "@/modules/storage/schema";
import { addSpaceMember, createProjectMaterial, createSpace } from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

const snapshot = (title: string, contentMd: string) => ({
  title,
  summary: null,
  sortOrder: 0,
  contentMd,
  tags: [],
  links: [],
});

export async function run() {
  const initialAdmin = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const projectA = await createProject(initialAdmin, {
    name: `Atlas Discovery ${suffix}`,
    researchLens: "vernacular architecture deltafind",
    description: "Project A authorized research",
  });
  const projectB = await createProject(initialAdmin, {
    name: `Harbor Research ${suffix}`,
    researchLens: "coastal memory echohidden",
    description: "Project B Core research",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  const ordinaryUser = await inviteUser(manager, {
    email: `stage14-ordinary-${suffix}@wisdomtree.local`,
    displayName: "Stage 14 ordinary researcher",
  });
  const coreUser = await inviteUser(manager, {
    email: `stage14-core-${suffix}@wisdomtree.local`,
    displayName: "Stage 14 Core researcher",
  });
  await addSpaceMember(manager, projectA.id, ordinaryUser.id, "contributor");
  await addSpaceMember(manager, projectA.id, coreUser.id, "contributor");
  const ordinary = await principalFor(`stage14-ordinary-${suffix}@wisdomtree.local`);
  const core = await principalFor(`stage14-core-${suffix}@wisdomtree.local`);

  const draftA = await createProjectNote(manager, {
    projectId: projectA.id,
    title: "Kiến trúc Huế",
    summary: "Authorized note summary",
    contentMd: "# Ghi chép\n\nalphabody shared research.",
  });
  const noteA = await publishDraft(manager, draftA.id);
  const draftB = await createProjectNote(manager, {
    projectId: projectB.id,
    title: "Project B official note",
    contentMd: "# Research\n\nechohidden official content.",
  });
  const noteB = await publishDraft(manager, draftB.id);
  const privateDraft = await createProjectNote(manager, {
    projectId: projectB.id,
    title: "Draft invisibility",
    contentMd: "draftonlysecret must never be indexed.",
  });
  assert.ok(privateDraft.id);

  const materialA = await createProjectMaterial(manager, {
    projectId: projectA.id,
    title: "Field archive",
    description: "materialmetatoken documented collection",
  });
  const materialB = await createProjectMaterial(manager, {
    projectId: projectB.id,
    title: "Coastal recording",
    description: "echohidden material context",
  });
  const activityB = await createProjectActivity(manager, {
    projectId: projectB.id,
    title: `Operational activity ${suffix}`,
    activityType: "fieldwork",
    summary: "echohidden operational context",
  });

  const sharedPersonName = `Trần Minh Shared ${suffix}`;
  const sharedPerson = await createProjectPerson(manager, {
    projectId: projectA.id,
    displayName: sharedPersonName,
    summary: "personsummarytoken community historian",
  });
  await attachPersonToProject(manager, { projectId: projectB.id, personId: sharedPerson.id });
  const personB = await createProjectPerson(manager, {
    projectId: projectB.id,
    displayName: "Bùi Core Only",
    summary: "echohidden interview subject",
  });
  const tieName = `Nguyễn Đồng Tên tiename${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const sameNameOne = await createProjectPerson(manager, {
    projectId: projectA.id,
    displayName: tieName,
  });
  const sameNameTwo = await createProjectPerson(manager, {
    projectId: projectA.id,
    displayName: tieName,
  });

  const legacySpace = await createSpace(manager, { name: `Legacy Search ${suffix}` });
  const refreshedManager = await principalFor("huong@wisdomtree.local");
  const legacyBranch = await createBranch(refreshedManager, {
    name: `Legacy Branch ${suffix}`,
    scope: "team",
    spaceId: legacySpace.id,
  });
  const legacyDraft = await createTeamDraft(refreshedManager, {
    branchId: legacyBranch.id,
    title: "Legacy invisible Note",
    summary: null,
    sortOrder: 0,
    contentMd: "legacyonlysecret target search must omit.",
    tags: [],
    links: [],
  });
  await publishDraft(refreshedManager, legacyDraft.id);
  await db.insert(sources).values({
    spaceId: legacySpace.id,
    title: "Legacy invisible Material",
    description: "legacymaterialsecret target search must omit.",
    submittedBy: refreshedManager.userId,
  });
  const personalSpaceId = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(and(eq(spaces.type, "personal"), eq(spaces.ownerUserId, refreshedManager.userId)))
    .then((rows) => rows[0]?.id);
  const personalBranch = await createBranch(refreshedManager, {
    name: `Private Search ${suffix}`,
    scope: "personal",
  });
  await createNode(refreshedManager, {
    branchId: personalBranch.id,
    title: "Personal invisible Note",
    contentMd: "personalonlysecret target search must omit.",
  });
  if (personalSpaceId) {
    await db.insert(sources).values({
      spaceId: personalSpaceId,
      title: "Personal invisible Material",
      description: "personalmaterialsecret target search must omit.",
      submittedBy: refreshedManager.userId,
    });
  }

  const projectHit = await searchInternalResearch(ordinary, {
    query: "deltafind",
    types: ["project"],
  });
  assert.equal(projectHit[0]?.kind, "project");
  assert.equal(projectHit[0]?.id, projectA.id);
  assert.equal((await searchInternalResearch(ordinary, { query: "echohidden" })).length, 0);
  assert.equal(
    (
      await searchInternalResearch(ordinary, {
        query: "deltafind",
        projectIds: [projectB.id],
      })
    ).length,
    0,
  );

  const accentHit = await searchInternalResearch(ordinary, {
    query: "kien truc hue",
    types: ["note"],
  });
  assert.equal(accentHit[0]?.id, noteA.nodeId);
  assert.equal(
    (
      await searchInternalResearch(ordinary, {
        query: "materialmetatoken",
        types: ["material"],
      })
    )[0]?.id,
    materialA.id,
  );
  assert.equal(
    (
      await searchInternalResearch(ordinary, {
        query: "personsummarytoken",
        types: ["person"],
      })
    )[0]?.id,
    sharedPerson.id,
  );

  const sharedBeforeCore = await searchInternalResearch(ordinary, {
    query: sharedPersonName,
    types: ["person"],
  });
  assert.equal(sharedBeforeCore.length, 1);
  assert.deepEqual(
    sharedBeforeCore[0]?.kind === "person"
      ? sharedBeforeCore[0].projects.map((project) => project.id)
      : [],
    [projectA.id],
  );
  const sameName = await searchInternalResearch(ordinary, {
    query: tieName,
    types: ["person"],
  });
  assert.deepEqual(
    sameName.map((person) => person.id),
    [sameNameOne.id, sameNameTwo.id].sort(),
  );

  await grantTmktCore(manager, core.userId);
  const coreHidden = await searchInternalResearch(core, { query: "echohidden" });
  assert.ok(coreHidden.some((result) => result.kind === "project" && result.id === projectB.id));
  assert.ok(coreHidden.some((result) => result.kind === "note" && result.id === noteB.nodeId));
  assert.ok(coreHidden.some((result) => result.kind === "material" && result.id === materialB.id));
  assert.ok(coreHidden.some((result) => result.kind === "person" && result.id === personB.id));
  assert.ok(!coreHidden.some((result) => result.kind === "activity" && result.id === activityB.id));
  assert.equal(
    (await searchInternalResearch(core, { query: "echohidden", types: ["activity"] })).length,
    0,
  );
  const sharedWithCore = await searchInternalResearch(core, {
    query: sharedPersonName,
    types: ["person"],
  });
  assert.deepEqual(
    sharedWithCore[0]?.kind === "person"
      ? sharedWithCore[0].projects.map((project) => project.id)
      : [],
    [projectA.id, projectB.id].sort(),
  );

  for (const secret of [
    "draftonlysecret",
    "legacyonlysecret",
    "legacymaterialsecret",
    "personalonlysecret",
    "personalmaterialsecret",
  ]) {
    assert.equal((await searchInternalResearch(refreshedManager, { query: secret })).length, 0);
    assert.equal((await searchInternalResearch(core, { query: secret })).length, 0);
    assert.equal((await searchPublishedNotes({ query: secret })).length, 0);
  }

  const titleRankDraft = await createProjectNote(refreshedManager, {
    projectId: projectA.id,
    title: "ranktoken title match",
    contentMd: "No body occurrence.",
  });
  const titleRank = await publishDraft(refreshedManager, titleRankDraft.id);
  const bodyRankDraft = await createProjectNote(refreshedManager, {
    projectId: projectA.id,
    title: "Body-only ranking fixture",
    contentMd: "ranktoken appears only in the body.",
  });
  const bodyRank = await publishDraft(refreshedManager, bodyRankDraft.id);
  const ranked = await searchInternalResearch(ordinary, {
    query: "ranktoken",
    types: ["note"],
  });
  assert.ok(
    ranked.findIndex((result) => result.id === titleRank.nodeId) <
      ranked.findIndex((result) => result.id === bodyRank.nodeId),
  );
  assert.deepEqual(
    (await searchInternalResearch(ordinary, { query: "ranktoken", types: ["note"] })).map(
      (result) => result.id,
    ),
    ranked.map((result) => result.id),
  );

  const publicDraft = await createProjectNote(refreshedManager, {
    projectId: projectB.id,
    title: "Public discovery fixture",
    contentMd: "publicoldtoken immutable revision one.",
  });
  const publicNode = await publishDraft(refreshedManager, publicDraft.id);
  const firstPublic = await publishNote(core, { noteId: publicNode.nodeId });
  assert.equal((await searchPublishedNotes({ query: "publicoldtoken" })).length, 1);
  assert.equal((await searchPublishedNotes({ query: "publicnewtoken" })).length, 0);
  const edit = await saveNodeDraft(refreshedManager, publicNode.nodeId, "vi", {
    ...snapshot("Public discovery fixture", "publicnewtoken immutable revision two."),
    baseVersion: 1,
    expectedDraftVersion: 0,
  });
  await publishDraft(refreshedManager, edit.id);
  assert.equal((await searchPublishedNotes({ query: "publicoldtoken" })).length, 1);
  assert.equal((await searchPublishedNotes({ query: "publicnewtoken" })).length, 0);
  await publishNote(core, { noteId: publicNode.nodeId });
  assert.equal((await searchPublishedNotes({ query: "publicoldtoken" })).length, 0);
  const publicV2 = await searchPublishedNotes({ query: "publicnewtoken" });
  assert.equal(publicV2.length, 1);
  assert.equal(publicV2[0].revisionNumber, 2);
  assert.equal("contentMd" in publicV2[0], false);
  assert.deepEqual(
    (await searchPublishedNotes({ query: "publicnewtoken", projectIds: [projectA.id] })).map(
      (result) => result.noteId,
    ),
    [],
  );
  await unpublishNote(core, publicNode.nodeId);
  assert.equal((await searchPublishedNotes({ query: "publicnewtoken" })).length, 0);
  await publishNote(core, { noteId: publicNode.nodeId });
  assert.equal((await searchPublishedNotes({ query: "publicnewtoken" })).length, 1);
  assert.equal(
    (
      await db
        .select()
        .from(notePublicRevisions)
        .where(eq(notePublicRevisions.noteId, publicNode.nodeId))
    ).length,
    2,
  );
  assert.ok(firstPublic.publication.publicSlug);

  await assert.rejects(
    searchInternalResearch(ordinary, { query: "   " }),
    errorCode("invalid_search_query"),
  );
  await assert.rejects(
    searchPublishedNotes({ query: "x".repeat(201) }),
    errorCode("invalid_search_query"),
  );
  await assert.rejects(
    searchInternalResearch(ordinary, { query: "safe", limit: 51 }),
    errorCode("invalid_search_limit"),
  );
  await assert.doesNotReject(
    searchInternalResearch(ordinary, { query: `alpha:* & ' || ${suffix}` }),
  );

  await revokeTmktCore(manager, core.userId);
  assert.equal((await searchInternalResearch(core, { query: "echohidden" })).length, 0);
  assert.ok(
    (await searchInternalResearch(core, { query: "alphabody" })).some(
      (result) => result.id === noteA.nodeId,
    ),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then(
    () => process.exit(0),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
