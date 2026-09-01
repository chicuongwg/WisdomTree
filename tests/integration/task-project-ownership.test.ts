import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import { projects } from "@/modules/project/schema";
import { createProject } from "@/modules/project/service";
import { tasks } from "@/modules/pm/schema";
import {
  createProjectTask,
  createTask,
  listProjectTasks,
  updateTask,
} from "@/modules/pm/service";
import { spaceMembers, spaces } from "@/modules/storage/schema";
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
  const [personal] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.type, "personal"));
  assert.ok(legacyTeam);
  assert.ok(personal);

  // The additive migration preserves seeded Board Tasks as legacy_unassigned.
  const legacyTasks = await db.select().from(tasks).where(isNull(tasks.projectId));
  assert.ok(legacyTasks.length >= 2);

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const project = await createProject(initialAdmin, {
    name: `Task Project ${suffix}`,
    researchLens: "Project-owned Task integration coverage",
  });
  const otherProject = await createProject(initialAdmin, {
    name: `Other Task Project ${suffix}`,
    researchLens: "Cross-Project Task isolation coverage",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(manager, project.id, contributorUser.userId, "contributor");
  await addSpaceMember(manager, project.id, viewerUser.userId, "viewer");
  const contributor = await principalFor("minh@wisdomtree.local");
  const viewer = await principalFor("lan@wisdomtree.local");

  // The FK accepts confirmed Projects and rejects arbitrary Space IDs.
  await assert.rejects(
    db.insert(tasks).values({
      projectId: randomUUID(),
      title: "Unknown Project FK",
      state: "todo",
      createdBy: initialAdmin.userId,
    }),
  );
  await assert.rejects(
    db.insert(tasks).values({
      projectId: legacyTeam.id,
      title: "Legacy Space FK",
      state: "todo",
      createdBy: initialAdmin.userId,
    }),
  );

  const assigned = await createProjectTask(manager, {
    projectId: project.id,
    title: " Prepare interview notes ",
    assigneeId: contributor.userId,
    notes: "Private working detail",
  });
  assert.equal(assigned.projectId, project.id);
  assert.equal(assigned.title, "Prepare interview notes");
  assert.equal(assigned.state, "todo");
  assert.equal(assigned.assignedTo, contributor.userId);

  const unassigned = await createProjectTask(contributor, {
    projectId: project.id,
    title: "Unassigned Project task",
  });
  assert.equal(unassigned.projectId, project.id);
  assert.equal(unassigned.assignedTo, null);

  await assert.rejects(
    createProjectTask(viewer, { projectId: project.id, title: "Viewer write" }),
    errorCode("forbidden"),
  );
  await assert.rejects(
    createProjectTask(manager, {
      projectId: project.id,
      title: "Unrelated assignee",
      assigneeId: outsider.userId,
    }),
    errorCode("invalid_project_assignee"),
  );
  await assert.rejects(
    createProjectTask(manager, { title: "Missing Project" }),
    errorCode("invalid_project_task"),
  );
  for (const invalidProjectId of [randomUUID(), legacyTeam.id, personal.id]) {
    await assert.rejects(
      createProjectTask(manager, { projectId: invalidProjectId, title: "Invalid Project" }),
      errorCode("not_found"),
    );
  }

  const otherTask = await createProjectTask(manager, {
    projectId: otherProject.id,
    title: "Other Project task",
  });
  const projectTasks = await listProjectTasks(viewer, project.id);
  assert.deepEqual(
    new Set(projectTasks.map((task) => task.id)),
    new Set([assigned.id, unassigned.id]),
  );
  assert.ok(projectTasks.every((task) => task.projectId === project.id));
  assert.ok(projectTasks.every((task) => task.id !== otherTask.id));
  assert.ok(projectTasks.every((task) => !legacyTasks.some((legacy) => legacy.id === task.id)));
  await assert.rejects(listProjectTasks(outsider, project.id), errorCode("not_found"));
  await assert.rejects(listProjectTasks(manager, legacyTeam.id), errorCode("not_found"));

  const [creationAudit] = await db
    .select({ details: auditEvents.details })
    .from(auditEvents)
    .where(and(eq(auditEvents.action, "task.create"), eq(auditEvents.targetId, assigned.id)));
  assert.deepEqual(creationAudit.details, {
    projectId: project.id,
    title: assigned.title,
    state: assigned.state,
    assignedTo: assigned.assignedTo,
  });
  assert.ok(!JSON.stringify(creationAudit.details).includes("Private working detail"));

  // The old Board path remains available but explicitly creates no ownership.
  const compatibilityTask = await createTask(initialAdmin, { title: `Legacy Board ${suffix}` });
  assert.equal(compatibilityTask.projectId, null);

  // Normal Task edits preserve Project ownership and optimistic concurrency.
  const updated = await updateTask(contributor, assigned.id, {
    title: "Prepared interview notes",
    expectedVersion: assigned.version,
  });
  assert.equal(updated.projectId, project.id);
  await assert.rejects(
    updateTask(contributor, assigned.id, {
      title: "Stale edit",
      expectedVersion: assigned.version,
    }),
    errorCode("version_conflict"),
  );

  // A failed Task insert cannot mutate its Project, memberships or audit log.
  const projectBefore = await db.select().from(projects).where(eq(projects.projectId, project.id));
  const membershipsBefore = await db
    .select()
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, project.id));
  const taskAuditCountBefore = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditEvents)
    .where(eq(auditEvents.action, "task.create"))
    .then((rows) => rows[0].count);
  await db.execute(sql`DROP TRIGGER IF EXISTS project_task_atomic_test_reject ON tasks`);
  await db.execute(sql`DROP FUNCTION IF EXISTS reject_project_task_atomic_test()`);
  await db.execute(sql`
    CREATE FUNCTION reject_project_task_atomic_test() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.title = '__reject_project_task_atomic_test__' THEN
        RAISE EXCEPTION 'forced Project Task test failure';
      END IF;
      RETURN NEW;
    END;
    $$
  `);
  await db.execute(sql`
    CREATE TRIGGER project_task_atomic_test_reject
    BEFORE INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION reject_project_task_atomic_test()
  `);
  try {
    await assert.rejects(
      createProjectTask(manager, {
        projectId: project.id,
        title: "__reject_project_task_atomic_test__",
      }),
    );
    assert.deepEqual(
      await db.select().from(projects).where(eq(projects.projectId, project.id)),
      projectBefore,
    );
    assert.deepEqual(
      await db.select().from(spaceMembers).where(eq(spaceMembers.spaceId, project.id)),
      membershipsBefore,
    );
    assert.equal(
      await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditEvents)
        .where(eq(auditEvents.action, "task.create"))
        .then((rows) => rows[0].count),
      taskAuditCountBefore,
    );
  } finally {
    await db.execute(sql`DROP TRIGGER IF EXISTS project_task_atomic_test_reject ON tasks`);
    await db.execute(sql`DROP FUNCTION IF EXISTS reject_project_task_atomic_test()`);
  }
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
