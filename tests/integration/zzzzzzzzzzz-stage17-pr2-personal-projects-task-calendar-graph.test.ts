import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  addAppProjectMember,
  claimAppProjectTask,
  createAppDeadline,
  createAppProject,
  createAppProjectMaterial,
  createAppProjectTask,
  ensureAppPersonalProject,
  getAppResearchGraph,
  getProjectWorkspace,
  inviteAppUser,
  listAppCalendarSchedule,
  listAppProjects,
  searchAppResearch,
  updateAppDeadline,
  updateAppProjectTask,
} from "@/modules/application";
import { grantTmktCore } from "@/modules/auth/core";
import { ApiError } from "@/lib/errors";
import { regenerateCalendarToken, renderCalendarFeed } from "@/modules/pm/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const ownerEmail = `stage17-pr2-owner-${suffix}@wisdomtree.local`;
  const outsiderEmail = `stage17-pr2-outsider-${suffix}@wisdomtree.local`;
  const coreEmail = `stage17-pr2-core-${suffix}@wisdomtree.local`;

  // The target user lifecycle provisions exactly one normal Project over the
  // existing Personal-Space model. Concurrent repeat calls converge on it.
  const ownerUser = await inviteAppUser(admin, {
    email: ownerEmail,
    displayName: "Stage 17 PR2 owner",
  });
  const [personalA, personalB, personalC] = await Promise.all([
    ensureAppPersonalProject(ownerUser.id),
    ensureAppPersonalProject(ownerUser.id),
    ensureAppPersonalProject(ownerUser.id),
  ]);
  assert.equal(personalA.id, personalB.id);
  assert.equal(personalA.id, personalC.id);

  const owner = await principalFor(ownerEmail);
  const ownerProjects = await listAppProjects(owner);
  const personalProjects = ownerProjects.filter((project) => project.isPersonal);
  assert.equal(personalProjects.length, 1);
  assert.equal(personalProjects[0].id, personalA.id);
  assert.equal(personalProjects[0].personalOwnerId, owner.userId);
  assert.equal((await getProjectWorkspace(owner, personalA.id)).modules.tasks, true);

  const outsiderUser = await inviteAppUser(admin, {
    email: outsiderEmail,
    displayName: "Stage 17 PR2 outsider",
  });
  const coreUser = await inviteAppUser(admin, {
    email: coreEmail,
    displayName: "Stage 17 PR2 Core reader",
  });
  await grantTmktCore(admin, coreUser.id);
  const outsider = await principalFor(outsiderEmail);
  const core = await principalFor(coreEmail);
  await assert.rejects(getProjectWorkspace(outsider, personalA.id), errorCode("not_found"));
  await assert.rejects(getProjectWorkspace(core, personalA.id), errorCode("not_found"));
  assert.equal((await listAppProjects(core)).some((project) => project.id === personalA.id), false);

  // Personal research participates in the same Materials/Search/Graph model,
  // while unrelated and Core-only users cannot discover it.
  const materialTitle = `Personal research material ${suffix}`;
  const material = await createAppProjectMaterial(owner, {
    projectId: personalA.id,
    title: materialTitle,
  });
  assert.ok(
    (await searchAppResearch(owner, { query: materialTitle, types: ["material"] })).some(
      (result) => result.id === material.id,
    ),
  );
  assert.equal(
    (await searchAppResearch(core, { query: materialTitle, types: ["material"] })).some(
      (result) => result.id === material.id,
    ),
    false,
  );
  const personalGraph = await getAppResearchGraph(owner, { projectId: personalA.id });
  assert.ok(personalGraph.nodes.some((node) => node.id === `project:${personalA.id}`));
  assert.ok(personalGraph.nodes.some((node) => node.id === `material:${material.id}`));
  await assert.rejects(getAppResearchGraph(outsider, { projectId: personalA.id }), errorCode("not_found"));
  await assert.rejects(getAppResearchGraph(core, { projectId: personalA.id }), errorCode("not_found"));

  // Shared Projects remain administrator-created. The owner is an ordinary
  // contributor there, so List, Kanban, Calendar and My Work all use the same
  // canonical Task records rather than a Board copy.
  const shared = await createAppProject(admin, {
    name: `PR2 shared Project ${suffix}`,
    researchLens: "Task and calendar parity",
  });
  const sharedManager = await principalFor("huong@wisdomtree.local");
  await addAppProjectMember(sharedManager, {
    projectId: shared.id,
    userId: owner.userId,
    memberRole: "contributor",
  });
  const ownerWithSharedProject = await principalFor(ownerEmail);
  const dueAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const personalTask = await createAppProjectTask(ownerWithSharedProject, {
    projectId: personalA.id,
    title: `Personal Kanban task ${suffix}`,
    dueAt,
  });
  const unassignedShared = await createAppProjectTask(sharedManager, {
    projectId: shared.id,
    title: `Claimable Kanban task ${suffix}`,
    dueAt,
  });
  assert.equal(unassignedShared.assignedTo, null);
  const claimed = await claimAppProjectTask(ownerWithSharedProject, shared.id, unassignedShared.id);
  assert.equal(claimed.assignedTo, owner.userId);
  assert.equal(claimed.state, "todo");
  const moved = await updateAppProjectTask(ownerWithSharedProject, shared.id, claimed.id, {
    state: "doing",
    expectedVersion: claimed.version,
  });
  assert.equal(moved.state, "doing");
  assert.equal(moved.assignedTo, owner.userId);
  assert.equal(moved.dueAt?.toISOString(), new Date(dueAt).toISOString());
  const inaccessibleClaim = await createAppProjectTask(sharedManager, {
    projectId: shared.id,
    title: `Unavailable claim ${suffix}`,
    dueAt,
  });
  await assert.rejects(claimAppProjectTask(core, shared.id, inaccessibleClaim.id), errorCode("not_found"));

  // Standalone Deadline remains distinct from Task due dates but joins the
  // same authorized workload projection and subscription feed.
  const deadline = await createAppDeadline(ownerWithSharedProject, {
    spaceId: personalA.id,
    title: `Personal deadline ${suffix}`,
    type: "milestone",
    dueAt,
  });
  const updatedDeadline = await updateAppDeadline(ownerWithSharedProject, deadline.id, {
    title: `Updated personal deadline ${suffix}`,
    expectedVersion: deadline.version,
  });
  assert.equal(updatedDeadline.title, `Updated personal deadline ${suffix}`);
  const range = {
    from: new Date(Date.now() - 86_400_000),
    to: new Date(Date.now() + 7 * 86_400_000),
  };
  const calendar = await listAppCalendarSchedule(ownerWithSharedProject, range);
  assert.ok(calendar.tasks.some((task) => task.id === personalTask.id));
  assert.ok(calendar.tasks.some((task) => task.id === claimed.id && task.state === "doing"));
  assert.ok(calendar.deadlines.some((item) => item.id === deadline.id));
  await assert.rejects(
    listAppCalendarSchedule(core, { ...range, projectId: personalA.id }),
    errorCode("not_found"),
  );

  const token = await regenerateCalendarToken(ownerWithSharedProject);
  const ics = await renderCalendarFeed(token);
  assert.match(ics, new RegExp(`Personal Kanban task ${suffix}`));
  assert.match(ics, new RegExp(`Updated personal deadline ${suffix}`));
  assert.equal(ics.includes(materialTitle), false);
  assert.ok(outsiderUser.id);
}
