import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  addAppProjectMaterialPhysical,
  approveAppProjectLoan,
  createAppProjectActivity,
  createAppProjectMaterial,
  createAppProjectNote,
  createAppProjectPerson,
  createAppProjectTask,
  enableAppProjectCapability,
  getAppActivity,
  getAppDraft,
  getAppPerson,
  getAppProjectMaterial,
  getAppProjectNote,
  getApplicationContext,
  getMyWork,
  getProjectWorkspace,
  getTmktOverview,
  grantAppProjectLibraryOperator,
  listAppProjectLoans,
  listAppProjectNotes,
  listAppProjects,
  publishAppDraft,
  publishAppNote,
  requestAppProjectMaterialLoan,
  saveAppNoteDraft,
  searchAppResearch,
  searchPublicNotes,
  setApplicationLocale,
  toApplicationError,
  unpublishAppNote,
  updateAppActivity,
} from "@/modules/application";
import { inviteUser } from "@/modules/auth/admin";
import { grantTmktCore } from "@/modules/auth/core";
import { users } from "@/modules/auth/schema";
import { createProject } from "@/modules/project/service";
import { addSpaceMember } from "@/modules/storage/service";
import { principalFor } from "../setup";

const FORBIDDEN_TARGET_KEYS = new Set([
  "spaceId",
  "spaceType",
  "branchId",
  "branchType",
  "personal",
  "team",
  "wikiRelease",
]);

function assertTargetShape(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertTargetShape);
    return;
  }
  if (!value || typeof value !== "object" || value instanceof Date) return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(FORBIDDEN_TARGET_KEYS.has(key), false, `legacy target key exposed: ${key}`);
    assertTargetShape(nested);
  }
}

async function capturedError(action: () => Promise<unknown>) {
  try {
    await action();
    assert.fail("expected application operation to fail");
  } catch (error) {
    return toApplicationError(error);
  }
}

export async function run() {
  const initialAdmin = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const ordinaryProject = await createProject(initialAdmin, {
    name: `Ordinary Research ${suffix}`,
    researchLens: "Project application contract",
  });
  const libraryProject = await createProject(initialAdmin, {
    name: `Community Collections ${suffix}`,
    researchLens: "Capability-driven circulation",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  const contributorEmail = `stage16-contributor-${suffix}@wisdomtree.local`;
  const operatorEmail = `stage16-operator-${suffix}@wisdomtree.local`;
  const borrowerEmail = `stage16-borrower-${suffix}@wisdomtree.local`;
  const coreEmail = `stage16-core-${suffix}@wisdomtree.local`;
  const contributorUser = await inviteUser(manager, {
    email: contributorEmail,
    displayName: "Stage 16 contributor",
  });
  const operatorUser = await inviteUser(manager, {
    email: operatorEmail,
    displayName: "Stage 16 library operator",
  });
  const borrowerUser = await inviteUser(manager, {
    email: borrowerEmail,
    displayName: "Stage 16 borrower",
  });
  const coreUser = await inviteUser(manager, {
    email: coreEmail,
    displayName: "Stage 16 Core reader",
  });
  await addSpaceMember(manager, ordinaryProject.id, contributorUser.id, "contributor");
  await addSpaceMember(manager, libraryProject.id, operatorUser.id, "contributor");
  await addSpaceMember(manager, libraryProject.id, borrowerUser.id, "viewer");
  const contributor = await principalFor(contributorEmail);
  const operator = await principalFor(operatorEmail);
  const borrower = await principalFor(borrowerEmail);
  const core = await principalFor(coreEmail);

  const multilingual = [
    "Tiếng Việt — kiến trúc Huế",
    "English research text",
    "漢字 / 漢文",
    "中文",
    "日本語",
    "한국어",
    "Français",
    "العربية",
    "𠀀",
  ].join("\n");

  const appContextVi = await getApplicationContext(contributor);
  assert.equal(appContextVi.locale, "vi");
  assert.deepEqual(appContextVi.supportedUiLocales, ["vi", "en"]);
  assert.deepEqual(Object.keys(appContextVi.currentUser).sort(), ["avatarUrl", "displayName", "id"]);
  await setApplicationLocale(contributor, "en");
  assert.equal((await getApplicationContext(contributor)).locale, "en");
  assert.equal(
    (await capturedError(() => setApplicationLocale(contributor, "fr"))).error,
    "invalid_input",
  );

  const draft = await createAppProjectNote(contributor, {
    projectId: ordinaryProject.id,
    title: `Đa ngữ ${suffix}`,
    summary: multilingual,
    contentMd: `# Research\n\n${multilingual}\n\npublicoldtoken`,
    researchPurpose: "synthesis",
  });
  assert.equal(draft.projectId, ordinaryProject.id);
  assert.equal(draft.authorPrivate, true);
  assert.equal(draft.contentMd?.includes("𠀀"), true);
  const official = await publishAppDraft(contributor, draft.id);
  const noteBeforeLocaleFallback = await getAppProjectNote(
    contributor,
    ordinaryProject.id,
    official.nodeId,
  );
  assert.equal(noteBeforeLocaleFallback.contentMd.includes(multilingual), true);
  assert.equal(noteBeforeLocaleFallback.publication.state, "never_published");

  await db.update(users).set({ locale: "unsupported-demo" }).where(eq(users.id, contributor.userId));
  assert.equal((await getApplicationContext(contributor)).locale, "vi");
  assert.equal(
    (await getAppProjectNote(contributor, ordinaryProject.id, official.nodeId)).contentMd,
    noteBeforeLocaleFallback.contentMd,
  );

  const material = await createAppProjectMaterial(contributor, {
    projectId: ordinaryProject.id,
    title: multilingual,
    description: `Material ${multilingual}`,
  });
  assert.equal(material.title, multilingual);
  assert.equal(
    (await getAppProjectMaterial(contributor, ordinaryProject.id, material.id)).description,
    `Material ${multilingual}`,
  );
  const person = await createAppProjectPerson(contributor, {
    projectId: ordinaryProject.id,
    displayName: `Nguyễn 𠀀 ${suffix}`,
    summary: multilingual,
  });
  assert.equal((await getAppPerson(contributor, person.id)).summary, multilingual);

  const contributorWorkspace = await getProjectWorkspace(contributor, ordinaryProject.id);
  assert.equal(contributorWorkspace.project.operationalMember, true);
  assert.equal(contributorWorkspace.project.capabilities.canCreateNote, true);
  assert.equal(contributorWorkspace.modules.activities, true);
  assert.equal(contributorWorkspace.modules.tasks, true);
  assert.equal(contributorWorkspace.modules.library, false);

  const activity = await createAppProjectActivity(contributor, {
    projectId: ordinaryProject.id,
    title: `Research session ${suffix}`,
    type: "research_session",
    summary: multilingual,
  });
  await createAppProjectTask(contributor, {
    projectId: ordinaryProject.id,
    activityId: activity.id,
    title: `Assigned work ${suffix}`,
    assigneeId: contributor.userId,
  });
  const myWork = await getMyWork(contributor);
  assert.ok(myWork.assignedTasks.some((task) => task.projectId === ordinaryProject.id));
  assert.ok(myWork.activities.some((item) => item.id === activity.id));
  assert.equal((await getTmktOverview(contributor)).myWork.assignedTaskCount > 0, true);

  await enableAppProjectCapability(manager, {
    projectId: libraryProject.id,
    capability: "library_circulation",
  });
  await grantAppProjectLibraryOperator(manager, {
    projectId: libraryProject.id,
    userId: operator.userId,
  });
  const libraryMaterial = await createAppProjectMaterial(manager, {
    projectId: libraryProject.id,
    title: `Circulation research ${suffix}`,
  });
  const physical = await addAppProjectMaterialPhysical(operator, {
    projectId: libraryProject.id,
    sourceId: libraryMaterial.id,
    copies: 1,
  });
  assert.equal(physical.materialId, libraryMaterial.id);

  const privateLibraryDraft = await createAppProjectNote(manager, {
    projectId: libraryProject.id,
    title: `Private library draft ${suffix}`,
    contentMd: "private-stage16-token",
  });
  const libraryOfficialDraft = await createAppProjectNote(manager, {
    projectId: libraryProject.id,
    title: `Official library note ${suffix}`,
    contentMd: "official-stage16-token",
  });
  const libraryOfficial = await publishAppDraft(manager, libraryOfficialDraft.id);
  await createAppProjectPerson(manager, {
    projectId: libraryProject.id,
    displayName: `Library subject ${suffix}`,
  });
  await createAppProjectActivity(manager, {
    projectId: libraryProject.id,
    title: `Private operations ${suffix}`,
  });
  await createAppProjectTask(manager, {
    projectId: libraryProject.id,
    title: `Private task operations ${suffix}`,
  });

  await grantTmktCore(manager, coreUser.id);
  const coreWorkspace = await getProjectWorkspace(core, libraryProject.id);
  assert.equal(coreWorkspace.project.researchReadable, true);
  assert.equal(coreWorkspace.project.operationalMember, false);
  assert.equal(coreWorkspace.project.features.libraryCirculation, true);
  assert.equal(coreWorkspace.modules.notes, true);
  assert.equal(coreWorkspace.modules.materials, true);
  assert.equal(coreWorkspace.modules.people, true);
  assert.equal(coreWorkspace.modules.activities, false);
  assert.equal(coreWorkspace.modules.tasks, false);
  assert.equal(coreWorkspace.modules.library, true);
  assert.equal(coreWorkspace.project.capabilities.canCreateNote, false);
  assert.equal(coreWorkspace.project.capabilities.canCreateMaterial, false);
  assert.equal(coreWorkspace.project.capabilities.canManageLibraryOperators, false);
  assert.equal(coreWorkspace.project.capabilities.isLibraryOperator, false);
  assert.equal((await listAppProjectNotes(core, libraryProject.id)).drafts.length, 0);
  await assert.rejects(getAppDraft(core, privateLibraryDraft.id));
  assert.equal(
    (await getAppProjectNote(core, libraryProject.id, libraryOfficial.nodeId)).id,
    libraryOfficial.nodeId,
  );
  assert.equal((await getMyWork(core)).activities.length, 0);

  const ticket = await requestAppProjectMaterialLoan(borrower, libraryMaterial.id);
  const forbiddenManager = await capturedError(() => approveAppProjectLoan(manager, ticket.id));
  assert.equal(forbiddenManager.error, "forbidden");
  await approveAppProjectLoan(operator, ticket.id);
  assert.equal(
    (await capturedError(() => approveAppProjectLoan(operator, ticket.id))).error,
    "invalid_state",
  );
  assert.equal(
    (await capturedError(() => listAppProjectLoans(core, libraryProject.id))).error,
    "forbidden",
  );

  assert.equal(
    (await capturedError(() => getAppActivity(core, activity.id))).error,
    "not_found",
  );
  assert.equal(
    (
      await capturedError(() =>
        createAppProjectNote(core, {
          projectId: libraryProject.id,
          title: "Denied",
          contentMd: "Denied",
        }),
      )
    ).error,
    "forbidden",
  );
  assert.equal(
    (
      await capturedError(() =>
        createAppProjectNote(contributor, {
          projectId: ordinaryProject.id,
          title: "",
          contentMd: "invalid",
        }),
      )
    ).error,
    "invalid_input",
  );
  const activityV2 = await updateAppActivity(contributor, {
    activityId: activity.id,
    summary: "updated",
    expectedVersion: activity.version,
  });
  assert.equal(activityV2.version, activity.version + 1);
  assert.equal(
    (
      await capturedError(() =>
        updateAppActivity(contributor, {
          activityId: activity.id,
          summary: "stale",
          expectedVersion: activity.version,
        }),
      )
    ).error,
    "version_conflict",
  );

  const projects = await listAppProjects(core);
  assert.ok(projects.some((project) => project.id === libraryProject.id));
  assert.ok(
    (await searchAppResearch(core, { query: "official-stage16-token", types: ["note"] })).some(
      (result) => result.id === libraryOfficial.nodeId,
    ),
  );

  const publication = await publishAppNote(core, { noteId: official.nodeId });
  assert.equal(publication.state, "published");
  assert.equal(
    (await getAppProjectNote(contributor, ordinaryProject.id, official.nodeId)).publication.state,
    "published_current",
  );
  assert.ok(
    (await searchPublicNotes({ query: "publicoldtoken" })).some(
      (result) => result.noteId === official.nodeId,
    ),
  );
  const edit = await saveAppNoteDraft(contributor, {
    projectId: ordinaryProject.id,
    noteId: official.nodeId,
    title: noteBeforeLocaleFallback.title,
    summary: multilingual,
    contentMd: `# Research\n\n${multilingual}\n\npublicnewtoken`,
    baseVersion: noteBeforeLocaleFallback.currentVersion,
    expectedVersion: 0,
  });
  assert.equal(edit.noteId, official.nodeId);
  await publishAppDraft(contributor, edit.id);
  assert.equal(
    (await getAppProjectNote(contributor, ordinaryProject.id, official.nodeId)).publication.state,
    "published_with_changes",
  );
  assert.ok(
    (await searchPublicNotes({ query: "publicoldtoken" })).some(
      (result) => result.noteId === official.nodeId,
    ),
  );
  assert.equal(
    (await searchPublicNotes({ query: "publicnewtoken" })).some(
      (result) => result.noteId === official.nodeId,
    ),
    false,
  );
  await publishAppNote(core, { noteId: official.nodeId });
  assert.ok(
    (await searchPublicNotes({ query: "publicnewtoken" })).some(
      (result) => result.noteId === official.nodeId,
    ),
  );
  await unpublishAppNote(core, official.nodeId);
  assert.equal(
    (await getAppProjectNote(contributor, ordinaryProject.id, official.nodeId)).publication.state,
    "unpublished",
  );
  assert.equal(
    (await searchPublicNotes({ query: "publicnewtoken" })).some(
      (result) => result.noteId === official.nodeId,
    ),
    false,
  );

  for (const dto of [
    appContextVi,
    contributorWorkspace,
    coreWorkspace,
    noteBeforeLocaleFallback,
    material,
    person,
    activity,
    myWork,
    projects,
  ]) {
    assertTargetShape(dto);
    assert.equal(JSON.stringify(dto).includes("library.physical.manage"), false);
    assert.equal(JSON.stringify(dto).includes("circulation.loan.manage"), false);
  }
  assert.equal(JSON.stringify(noteBeforeLocaleFallback).includes("�"), false);
}
