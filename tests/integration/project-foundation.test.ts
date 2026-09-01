import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import { projects } from "@/modules/project/schema";
import {
  createProject,
  getProject,
  listProjects,
  registerExistingTeamSpaceAsProject,
  updateProject,
} from "@/modules/project/service";
import { folders, spaceMembers, spaces } from "@/modules/storage/schema";
import { addSpaceMember, createSpace } from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const outsider = await principalFor("duc@wisdomtree.local");
  const [legacyTeam] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Kho Dự Án Cộng Đồng"))
    .limit(1);
  const [personal] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.type, "personal"))
    .limit(1);
  assert.ok(legacyTeam);
  assert.ok(personal);

  // The migration is additive: seeded team and personal spaces have no
  // Project extension and cannot be discovered through the Project service.
  await assert.rejects(getProject(admin, legacyTeam.id), errorCode("not_found"));
  await assert.rejects(getProject(admin, personal.id), errorCode("not_found"));
  assert.ok((await listProjects(admin)).every((project) => project.id !== legacyTeam.id));

  // The database enforces both halves of Project identity: a referenced Space
  // must exist and must remain type=team.
  await assert.rejects(
    db.insert(projects).values({
      projectId: randomUUID(),
      researchLens: "Invalid missing Space",
      createdBy: admin.userId,
    }),
  );
  await assert.rejects(
    db.insert(projects).values({
      projectId: personal.id,
      researchLens: "Invalid Personal Space",
      createdBy: admin.userId,
    }),
  );

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const project = await createProject(admin, {
    name: `Project foundation ${suffix}`,
    researchLens: "How Project identity remains stable during migration",
    description: "Stage 3 integration fixture",
  });
  const [space] = await db.select().from(spaces).where(eq(spaces.id, project.id));
  const [extension] = await db.select().from(projects).where(eq(projects.projectId, project.id));
  const [creatorMembership] = await db
    .select()
    .from(spaceMembers)
    .where(and(eq(spaceMembers.spaceId, project.id), eq(spaceMembers.userId, admin.userId)));
  assert.equal(space.type, "team");
  assert.equal(extension.projectId, space.id);
  assert.equal(project.id, space.id);
  assert.equal(project.name, space.name);
  assert.equal(project.status, "active");
  assert.equal(project.researchLens, "How Project identity remains stable during migration");
  assert.equal(creatorMembership.memberRole, "manager");
  assert.ok(
    await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(and(eq(auditEvents.action, "project.create"), eq(auditEvents.targetId, project.id)))
      .then((rows) => rows[0]),
  );

  // A confirmed Project cannot later be retyped as a Personal Space.
  await assert.rejects(
    db.update(spaces).set({ type: "personal" }).where(eq(spaces.id, project.id)),
  );

  // A later request resolves the membership created in the same transaction.
  const projectManager = await principalFor("huong@wisdomtree.local");
  const memberBeforeRefresh = await principalFor("lan@wisdomtree.local");

  // Existing createSpace remains a legacy Team Space operation and does not
  // silently register a Project.
  const legacyCreated = await createSpace(admin, { name: `Legacy Space ${suffix}` });
  assert.equal(legacyCreated.type, "team");
  assert.equal(
    await db
      .select({ id: projects.projectId })
      .from(projects)
      .where(eq(projects.projectId, legacyCreated.id))
      .then((rows) => rows.length),
    0,
  );

  const registrationSpace = await createSpace(admin, { name: `Registration Space ${suffix}` });
  const registrationManager = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(
    registrationManager,
    registrationSpace.id,
    memberBeforeRefresh.userId,
    "viewer",
  );
  const [registrationFolder] = await db
    .insert(folders)
    .values({
      spaceId: registrationSpace.id,
      name: `Registration folder ${suffix}`,
      createdBy: admin.userId,
    })
    .returning();
  const membershipsBeforeRegistration = await db
    .select()
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, registrationSpace.id));
  const outsiderBeforeRegistration = await principalFor("duc@wisdomtree.local");
  await assert.rejects(
    registerExistingTeamSpaceAsProject(outsiderBeforeRegistration, {
      spaceId: registrationSpace.id,
      researchLens: "Unauthorized registration",
      status: "active",
    }),
    errorCode("forbidden"),
  );
  await assert.rejects(
    registerExistingTeamSpaceAsProject(registrationManager, {
      spaceId: randomUUID(),
      researchLens: "Unknown Space",
      status: "active",
    }),
    errorCode("not_found"),
  );
  const [adminPersonal] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(and(eq(spaces.type, "personal"), eq(spaces.ownerUserId, admin.userId)));
  assert.ok(adminPersonal);
  await assert.rejects(
    registerExistingTeamSpaceAsProject(registrationManager, {
      spaceId: adminPersonal.id,
      researchLens: "Personal is not a Project",
      status: "active",
    }),
    errorCode("invalid_project_space"),
  );

  const registered = await registerExistingTeamSpaceAsProject(registrationManager, {
    spaceId: registrationSpace.id,
    researchLens: " Existing research lens ",
    description: " Existing Project registration ",
    status: "paused",
  });
  assert.equal(registered.id, registrationSpace.id);
  assert.equal(registered.name, registrationSpace.name);
  assert.equal(registered.researchLens, "Existing research lens");
  assert.equal(registered.description, "Existing Project registration");
  assert.equal(registered.status, "paused");
  assert.equal(registered.version, 1);
  assert.deepEqual(
    await db.select().from(spaceMembers).where(eq(spaceMembers.spaceId, registrationSpace.id)),
    membershipsBeforeRegistration,
  );
  assert.ok(
    await db
      .select({ id: folders.id })
      .from(folders)
      .where(eq(folders.id, registrationFolder.id))
      .then((rows) => rows[0]),
  );
  assert.ok(
    await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, "project.register"),
          eq(auditEvents.targetId, registrationSpace.id),
        ),
      )
      .then((rows) => rows[0]),
  );
  await assert.rejects(
    registerExistingTeamSpaceAsProject(registrationManager, {
      spaceId: registrationSpace.id,
      researchLens: "Duplicate registration",
      status: "active",
    }),
    errorCode("project_exists"),
  );

  // Current Space membership remains the access source. The creator can read;
  // an outsider receives the same non-disclosing 404 used by existing scopes.
  assert.equal((await getProject(admin, project.id)).id, project.id);
  await assert.rejects(getProject(outsider, project.id), errorCode("not_found"));
  assert.ok((await listProjects(outsider)).every((row) => row.id !== project.id));

  await addSpaceMember(projectManager, project.id, memberBeforeRefresh.userId, "viewer");
  const viewer = await principalFor("lan@wisdomtree.local");
  assert.equal((await getProject(viewer, project.id)).id, project.id);
  const viewerProjects = await listProjects(viewer);
  assert.ok(viewerProjects.some((row) => row.id === project.id));
  assert.ok(viewerProjects.every((row) => row.id !== legacyTeam.id && row.id !== personal.id));

  // Project metadata uses optimistic concurrency. Status changes do not remove
  // data owned by the underlying Space.
  const [folder] = await db
    .insert(folders)
    .values({ spaceId: project.id, name: `Project folder ${suffix}`, createdBy: admin.userId })
    .returning();
  await assert.rejects(
    updateProject(viewer, project.id, {
      description: "Viewer cannot manage Project metadata",
      expectedVersion: project.version,
    }),
    errorCode("forbidden"),
  );
  const updated = await updateProject(projectManager, project.id, {
    researchLens: "Updated research lens",
    description: null,
    status: "completed",
    expectedVersion: project.version,
  });
  assert.equal(updated.status, "completed");
  assert.equal(updated.researchLens, "Updated research lens");
  assert.equal(updated.description, null);
  assert.equal(updated.version, project.version + 1);
  assert.ok(
    await db
      .select()
      .from(spaces)
      .where(eq(spaces.id, project.id))
      .then((rows) => rows[0]),
  );
  assert.ok(
    await db
      .select()
      .from(folders)
      .where(eq(folders.id, folder.id))
      .then((rows) => rows[0]),
  );
  await assert.rejects(
    updateProject(projectManager, project.id, {
      status: "paused",
      expectedVersion: project.version,
    }),
    errorCode("version_conflict"),
  );
  assert.ok(
    await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(and(eq(auditEvents.action, "project.update"), eq(auditEvents.targetId, project.id)))
      .then((rows) => rows[0]),
  );

  // Force the extension insert to fail after Space creation. Both Space and
  // its audit/member rows must roll back with the Project transaction.
  const atomicName = `Atomic rollback ${suffix}`;
  const atomicRegistrationSpace = await createSpace(admin, {
    name: `Atomic registration ${suffix}`,
  });
  const atomicRegistrationManager = await principalFor("huong@wisdomtree.local");
  const [atomicRegistrationFolder] = await db
    .insert(folders)
    .values({
      spaceId: atomicRegistrationSpace.id,
      name: `Atomic registration folder ${suffix}`,
      createdBy: admin.userId,
    })
    .returning();
  const atomicMembershipsBefore = await db
    .select()
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, atomicRegistrationSpace.id));
  await db.execute(sql`DROP TRIGGER IF EXISTS project_atomic_test_reject ON projects`);
  await db.execute(sql`DROP FUNCTION IF EXISTS reject_project_atomic_test()`);
  await db.execute(sql`
    CREATE FUNCTION reject_project_atomic_test() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.research_lens = '__reject_atomic_test__' THEN
        RAISE EXCEPTION 'forced atomic Project test failure';
      END IF;
      RETURN NEW;
    END;
    $$
  `);
  await db.execute(sql`
    CREATE TRIGGER project_atomic_test_reject
    BEFORE INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION reject_project_atomic_test()
  `);
  try {
    await assert.rejects(
      createProject(admin, {
        name: atomicName,
        researchLens: "__reject_atomic_test__",
      }),
    );
    assert.equal(
      await db
        .select({ id: spaces.id })
        .from(spaces)
        .where(eq(spaces.name, atomicName))
        .then((rows) => rows.length),
      0,
    );
    await assert.rejects(
      registerExistingTeamSpaceAsProject(atomicRegistrationManager, {
        spaceId: atomicRegistrationSpace.id,
        researchLens: "__reject_atomic_test__",
        status: "active",
      }),
    );
    assert.equal(
      await db
        .select({ id: projects.projectId })
        .from(projects)
        .where(eq(projects.projectId, atomicRegistrationSpace.id))
        .then((rows) => rows.length),
      0,
    );
    assert.deepEqual(
      await db
        .select()
        .from(spaceMembers)
        .where(eq(spaceMembers.spaceId, atomicRegistrationSpace.id)),
      atomicMembershipsBefore,
    );
    assert.ok(
      await db
        .select({ id: folders.id })
        .from(folders)
        .where(eq(folders.id, atomicRegistrationFolder.id))
        .then((rows) => rows[0]),
    );
    assert.equal(
      await db
        .select({ id: auditEvents.id })
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.action, "project.register"),
            eq(auditEvents.targetId, atomicRegistrationSpace.id),
          ),
        )
        .then((rows) => rows.length),
      0,
    );
  } finally {
    await db.execute(sql`DROP TRIGGER IF EXISTS project_atomic_test_reject ON projects`);
    await db.execute(sql`DROP FUNCTION IF EXISTS reject_project_atomic_test()`);
  }
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
