import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import {
  addActivityMaterial,
  addActivityNote,
  addActivityParticipant,
  createProjectActivity,
  getActivity,
  listActivityMaterials,
  listActivityNotes,
  listActivityParticipants,
  listActivityTasks,
  listProjectActivities,
  removeActivityMaterial,
  removeActivityNote,
  removeActivityParticipant,
  updateActivity,
} from "@/modules/activity/service";
import {
  activities,
  activityMaterials,
  activityNotes,
  activityPeople,
} from "@/modules/activity/schema";
import { treeNodes } from "@/modules/knowledge/schema";
import {
  addDraftSupportingSourceVersion,
  createProjectNote,
  publishDraft,
} from "@/modules/knowledge/service";
import { createProjectPerson } from "@/modules/person/service";
import { projectPeople } from "@/modules/person/schema";
import {
  attachTaskToActivity,
  createProjectTask,
  createTask,
  detachTaskFromActivity,
} from "@/modules/pm/service";
import { tasks } from "@/modules/pm/schema";
import { createProject } from "@/modules/project/service";
import { extractionWorker } from "@/modules/storage/extraction";
import { sources, spaces } from "@/modules/storage/schema";
import { addSpaceMember, createProjectMaterial, uploadSource } from "@/modules/storage/service";
import { noteSupportSourceVersions } from "@/modules/knowledge/schema";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  assert.equal(
    await db
      .select()
      .from(activities)
      .then((rows) => rows.length),
    0,
  );
  assert.equal(
    await db
      .select()
      .from(activityPeople)
      .then((rows) => rows.length),
    0,
  );
  assert.equal(
    await db
      .select()
      .from(activityMaterials)
      .then((rows) => rows.length),
    0,
  );
  assert.equal(
    await db
      .select()
      .from(activityNotes)
      .then((rows) => rows.length),
    0,
  );
  assert.ok((await db.select().from(tasks)).every((task) => task.activityId === null));

  const admin = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("minh@wisdomtree.local");
  const viewerUser = await principalFor("lan@wisdomtree.local");
  const outsider = await principalFor("duc@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const projectA = await createProject(admin, {
    name: `Activity Project A ${suffix}`,
    researchLens: "Living research activities",
  });
  const projectB = await createProject(admin, {
    name: `Activity Project B ${suffix}`,
    researchLens: "Cross-Project invariant",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(manager, projectA.id, contributorUser.userId, "contributor");
  await addSpaceMember(manager, projectA.id, viewerUser.userId, "viewer");
  const contributor = await principalFor("minh@wisdomtree.local");
  const viewer = await principalFor("lan@wisdomtree.local");

  const activity = await createProjectActivity(contributor, {
    projectId: projectA.id,
    title: " Interview with community archivist ",
    activityType: "oral-history interview",
    summary: "Preparation, conversation and debrief.",
  });
  assert.equal(activity.projectId, projectA.id);
  assert.equal(activity.status, "planned");
  assert.equal(activity.title, "Interview with community archivist");
  assert.equal((await getActivity(viewer, activity.id)).id, activity.id);
  assert.deepEqual(
    (await listProjectActivities(viewer, projectA.id)).map((row) => row.id),
    [activity.id],
  );
  await assert.rejects(getActivity(outsider, activity.id), errorCode("not_found"));
  await assert.rejects(
    createProjectActivity(viewer, { projectId: projectA.id, title: "Viewer activity" }),
    errorCode("forbidden"),
  );
  await assert.rejects(
    createProjectActivity(outsider, { projectId: projectA.id, title: "Guessed activity" }),
    errorCode("not_found"),
  );
  const [personalSpace] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.type, "personal"))
    .limit(1);
  const [legacyTeam] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Kho Dự Án Cộng Đồng"))
    .limit(1);
  for (const projectId of [personalSpace.id, legacyTeam.id, randomUUID()]) {
    await assert.rejects(
      createProjectActivity(manager, { projectId, title: "Invalid Project context" }),
      errorCode("not_found"),
    );
  }

  const completed = await updateActivity(contributor, {
    activityId: activity.id,
    status: "completed",
    expectedVersion: activity.version,
  });
  const corrected = await updateActivity(contributor, {
    activityId: activity.id,
    summary: "Corrected debrief after completion.",
    expectedVersion: completed.version,
  });
  assert.equal(corrected.status, "completed");
  await assert.rejects(
    updateActivity(contributor, {
      activityId: activity.id,
      status: "closed",
      expectedVersion: corrected.version,
    }),
    errorCode("invalid_activity_status"),
  );
  await assert.rejects(
    updateActivity(contributor, {
      activityId: activity.id,
      title: "Stale",
      expectedVersion: completed.version,
    }),
    errorCode("version_conflict"),
  );

  const participant = await createProjectPerson(contributor, {
    projectId: projectA.id,
    displayName: "Interview subject without account",
  });
  const otherPerson = await createProjectPerson(manager, {
    projectId: projectB.id,
    displayName: "Other Project subject",
  });
  assert.equal(
    (
      await addActivityParticipant(contributor, {
        activityId: activity.id,
        personId: participant.id,
        roleLabel: " interviewee ",
      })
    ).created,
    true,
  );
  assert.equal(
    (
      await addActivityParticipant(contributor, {
        activityId: activity.id,
        personId: participant.id,
        roleLabel: "interviewee",
      })
    ).created,
    false,
  );
  assert.equal((await listActivityParticipants(viewer, activity.id))[0]?.roleLabel, "interviewee");
  await assert.rejects(
    addActivityParticipant(contributor, {
      activityId: activity.id,
      personId: otherPerson.id,
    }),
    errorCode("invalid_activity_person"),
  );
  await assert.rejects(
    db.insert(activityPeople).values({
      activityId: activity.id,
      projectId: projectA.id,
      personId: otherPerson.id,
      createdBy: contributor.userId,
    }),
  );
  assert.equal(
    await db
      .select()
      .from(projectPeople)
      .where(
        and(eq(projectPeople.projectId, projectA.id), eq(projectPeople.personId, participant.id)),
      )
      .then((rows) => rows.length),
    1,
  );

  const task = await createProjectTask(contributor, {
    projectId: projectA.id,
    activityId: activity.id,
    title: "Prepare interview questions",
  });
  assert.equal(task.activityId, activity.id);
  assert.equal((await listActivityTasks(viewer, activity.id))[0]?.id, task.id);
  await assert.rejects(
    db.insert(tasks).values({
      title: "Activity context without a Project",
      state: "todo",
      activityId: activity.id,
      createdBy: contributor.userId,
    }),
  );
  const unattachedTask = await createProjectTask(contributor, {
    projectId: projectA.id,
    title: "Process transcript",
  });
  const attachedTask = await attachTaskToActivity(contributor, {
    taskId: unattachedTask.id,
    activityId: activity.id,
    expectedVersion: unattachedTask.version,
  });
  assert.equal(attachedTask.id, unattachedTask.id);
  assert.equal(attachedTask.activityId, activity.id);
  const detachedTask = await detachTaskFromActivity(contributor, {
    taskId: unattachedTask.id,
    expectedVersion: attachedTask.version,
  });
  assert.equal(detachedTask.activityId, null);
  assert.equal(detachedTask.projectId, projectA.id);
  const projectBTask = await createProjectTask(manager, {
    projectId: projectB.id,
    title: "Other Project task",
  });
  await assert.rejects(
    attachTaskToActivity(manager, {
      taskId: projectBTask.id,
      activityId: activity.id,
      expectedVersion: projectBTask.version,
    }),
    errorCode("invalid_task_activity"),
  );
  await assert.rejects(
    createProjectTask(manager, {
      projectId: projectB.id,
      activityId: activity.id,
      title: "Cross-Project create",
    }),
    errorCode("invalid_task_activity"),
  );
  const legacyTask = await createTask(contributor, { title: `Legacy Task ${suffix}` });
  await assert.rejects(
    attachTaskToActivity(contributor, {
      taskId: legacyTask.id,
      activityId: activity.id,
      expectedVersion: legacyTask.version,
    }),
    errorCode("invalid_project_task"),
  );
  await assert.rejects(
    db.update(tasks).set({ activityId: activity.id }).where(eq(tasks.id, projectBTask.id)),
  );

  const enqueue = extractionWorker.enqueue;
  extractionWorker.enqueue = () => undefined;
  try {
    const material = await createProjectMaterial(contributor, {
      projectId: projectA.id,
      title: "Interview recording",
      file: new File(["recording"], "recording.txt", { type: "text/plain" }),
    });
    const otherMaterial = await createProjectMaterial(manager, {
      projectId: projectB.id,
      title: "Other Project Material",
    });
    assert.equal(
      (await addActivityMaterial(contributor, { activityId: activity.id, sourceId: material.id }))
        .created,
      true,
    );
    assert.equal(
      (await addActivityMaterial(contributor, { activityId: activity.id, sourceId: material.id }))
        .created,
      false,
    );
    assert.equal((await listActivityMaterials(viewer, activity.id))[0]?.sourceId, material.id);
    await assert.rejects(
      addActivityMaterial(contributor, {
        activityId: activity.id,
        sourceId: otherMaterial.id,
      }),
      errorCode("invalid_activity_material"),
    );
    const legacyMaterial = await uploadSource(manager, {
      spaceId: legacyTeam.id,
      title: `Legacy Material ${suffix}`,
      file: new File(["legacy"], "legacy.txt", { type: "text/plain" }),
    });
    await assert.rejects(
      addActivityMaterial(contributor, {
        activityId: activity.id,
        sourceId: legacyMaterial.id,
      }),
      errorCode("invalid_activity_material"),
    );

    const noteDraft = await createProjectNote(contributor, {
      projectId: projectA.id,
      title: "Interview debrief",
      contentMd: "Internal outcome.",
    });
    await addDraftSupportingSourceVersion(contributor, {
      draftId: noteDraft.id,
      sourceVersionId: material.currentVersion!.id,
    });
    const note = await publishDraft(contributor, noteDraft.id);
    const otherDraft = await createProjectNote(manager, {
      projectId: projectB.id,
      title: "Other Project Note",
      contentMd: "Other outcome.",
    });
    const otherNote = await publishDraft(manager, otherDraft.id);
    assert.equal(
      (await addActivityNote(contributor, { activityId: activity.id, nodeId: note.nodeId }))
        .created,
      true,
    );
    assert.equal((await listActivityNotes(viewer, activity.id))[0]?.nodeId, note.nodeId);
    await assert.rejects(
      addActivityNote(contributor, { activityId: activity.id, nodeId: otherNote.nodeId }),
      errorCode("invalid_activity_note"),
    );
    const [legacyNode] = await db
      .select({ id: treeNodes.id })
      .from(treeNodes)
      .where(sql`${treeNodes.projectId} IS NULL`)
      .limit(1);
    await assert.rejects(
      addActivityNote(contributor, { activityId: activity.id, nodeId: legacyNode.id }),
      errorCode("invalid_activity_note"),
    );
    await removeActivityNote(contributor, { activityId: activity.id, nodeId: note.nodeId });
    assert.ok(
      await db
        .select()
        .from(treeNodes)
        .where(eq(treeNodes.id, note.nodeId))
        .then((r) => r[0]),
    );
    assert.equal(
      await db
        .select()
        .from(noteSupportSourceVersions)
        .where(eq(noteSupportSourceVersions.nodeId, note.nodeId))
        .then((rows) => rows.length),
      1,
    );
    await removeActivityMaterial(contributor, { activityId: activity.id, sourceId: material.id });
    assert.ok(
      await db
        .select()
        .from(sources)
        .where(eq(sources.id, material.id))
        .then((r) => r[0]),
    );
  } finally {
    extractionWorker.enqueue = enqueue;
  }

  await removeActivityParticipant(contributor, {
    activityId: activity.id,
    personId: participant.id,
  });
  assert.equal(
    await db
      .select()
      .from(projectPeople)
      .where(eq(projectPeople.personId, participant.id))
      .then((r) => r.length),
    1,
  );
}
