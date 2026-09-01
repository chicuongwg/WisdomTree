import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import { users } from "@/modules/auth/schema";
import { personUserLinks, persons, projectPeople } from "@/modules/person/schema";
import {
  attachPersonToProject,
  createProjectPerson,
  getPerson,
  listProjectPeople,
  searchAccessiblePeople,
  updatePerson,
} from "@/modules/person/service";
import { createProject } from "@/modules/project/service";
import { spaceMembers, spaces } from "@/modules/storage/schema";
import { addSpaceMember } from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  assert.equal(
    await db
      .select()
      .from(persons)
      .then((rows) => rows.length),
    0,
  );
  assert.equal(
    await db
      .select()
      .from(projectPeople)
      .then((rows) => rows.length),
    0,
  );
  assert.equal(
    await db
      .select()
      .from(personUserLinks)
      .then((rows) => rows.length),
    0,
  );

  const admin = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("minh@wisdomtree.local");
  const viewerUser = await principalFor("lan@wisdomtree.local");
  const outsiderUser = await principalFor("duc@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  const projectA = await createProject(admin, {
    name: `Person Project A ${suffix}`,
    researchLens: "Canonical people",
  });
  const projectB = await createProject(admin, {
    name: `Person Project B ${suffix}`,
    researchLens: "Cross-project identity",
  });
  const projectC = await createProject(admin, {
    name: `Person Project C ${suffix}`,
    researchLens: "Inaccessible identity",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(manager, projectA.id, contributorUser.userId, "contributor");
  await addSpaceMember(manager, projectA.id, viewerUser.userId, "viewer");
  await addSpaceMember(manager, projectB.id, contributorUser.userId, "contributor");
  const contributor = await principalFor("minh@wisdomtree.local");
  const viewer = await principalFor("lan@wisdomtree.local");
  const outsider = await principalFor("duc@wisdomtree.local");

  const person = await createProjectPerson(contributor, {
    projectId: projectA.id,
    displayName: " Nguyễn Văn A ",
    summary: " Research participant ",
  });
  const sameName = await createProjectPerson(contributor, {
    projectId: projectA.id,
    displayName: "Nguyễn Văn A",
  });
  assert.notEqual(person.id, sameName.id);
  assert.equal(person.displayName, "Nguyễn Văn A");
  assert.equal(person.summary, "Research participant");
  assert.equal(
    await db
      .select()
      .from(personUserLinks)
      .where(eq(personUserLinks.personId, person.id))
      .then((rows) => rows.length),
    0,
  );

  assert.equal(
    (
      await attachPersonToProject(contributor, {
        projectId: projectB.id,
        personId: person.id,
      })
    ).created,
    true,
  );
  assert.equal(
    (
      await attachPersonToProject(contributor, {
        projectId: projectB.id,
        personId: person.id,
      })
    ).created,
    false,
  );
  assert.equal(
    await db
      .select()
      .from(projectPeople)
      .where(eq(projectPeople.personId, person.id))
      .then((rows) => rows.length),
    2,
  );
  assert.equal(
    await db
      .select()
      .from(persons)
      .where(eq(persons.id, person.id))
      .then((r) => r.length),
    1,
  );

  await assert.rejects(
    createProjectPerson(viewer, {
      projectId: projectA.id,
      displayName: "Viewer-created Person",
    }),
    errorCode("forbidden"),
  );
  await assert.rejects(
    createProjectPerson(outsider, {
      projectId: projectA.id,
      displayName: "Guessed Project",
    }),
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
  await assert.rejects(
    createProjectPerson(manager, {
      projectId: personalSpace.id,
      displayName: "Personal Space Person",
    }),
    errorCode("not_found"),
  );
  await assert.rejects(
    createProjectPerson(manager, {
      projectId: legacyTeam.id,
      displayName: "Legacy Space Person",
    }),
    errorCode("not_found"),
  );
  await assert.rejects(
    createProjectPerson(manager, { projectId: randomUUID(), displayName: "Unknown Project" }),
    errorCode("not_found"),
  );

  const inaccessiblePerson = await createProjectPerson(manager, {
    projectId: projectC.id,
    displayName: "Inaccessible Person",
  });
  await assert.rejects(
    attachPersonToProject(contributor, {
      projectId: projectB.id,
      personId: inaccessiblePerson.id,
    }),
    errorCode("not_found"),
  );
  await assert.rejects(getPerson(contributor, inaccessiblePerson.id), errorCode("not_found"));

  assert.deepEqual(
    (await getPerson(contributor, person.id)).projectIds,
    [projectA.id, projectB.id].sort(),
  );
  assert.deepEqual(
    (await listProjectPeople(contributor, projectB.id)).map((row) => row.id),
    [person.id],
  );
  assert.deepEqual(
    (await searchAccessiblePeople(contributor, "Nguyễn Văn A")).map((row) => row.id).sort(),
    [person.id, sameName.id].sort(),
  );
  assert.ok(
    !(await searchAccessiblePeople(contributor)).some((row) => row.id === inaccessiblePerson.id),
  );
  assert.ok((await listProjectPeople(viewer, projectA.id)).some((row) => row.id === person.id));
  await assert.rejects(listProjectPeople(outsider, projectA.id), errorCode("not_found"));

  const updated = await updatePerson(contributor, {
    personId: person.id,
    displayName: "Nguyễn Văn A — updated",
    summary: null,
    expectedVersion: person.version,
  });
  assert.equal(updated.version, person.version + 1);
  assert.equal(updated.summary, null);
  assert.equal(
    (await listProjectPeople(contributor, projectA.id)).find((row) => row.id === person.id)
      ?.displayName,
    "Nguyễn Văn A — updated",
  );
  assert.equal(
    (await listProjectPeople(contributor, projectB.id)).find((row) => row.id === person.id)
      ?.displayName,
    "Nguyễn Văn A — updated",
  );
  await assert.rejects(
    updatePerson(contributor, {
      personId: person.id,
      displayName: "Stale update",
      expectedVersion: person.version,
    }),
    errorCode("version_conflict"),
  );
  await assert.rejects(
    updatePerson(viewer, {
      personId: person.id,
      displayName: "Viewer update",
      expectedVersion: updated.version,
    }),
    errorCode("forbidden"),
  );

  const membershipsBeforeLink = await db
    .select()
    .from(spaceMembers)
    .where(eq(spaceMembers.userId, outsiderUser.userId));
  await db.insert(personUserLinks).values({
    personId: person.id,
    userId: outsiderUser.userId,
    linkedBy: admin.userId,
  });
  assert.deepEqual(
    await db.select().from(spaceMembers).where(eq(spaceMembers.userId, outsiderUser.userId)),
    membershipsBeforeLink,
  );
  await assert.rejects(getPerson(outsider, person.id), errorCode("not_found"));
  await assert.rejects(
    db.insert(personUserLinks).values({
      personId: sameName.id,
      userId: outsiderUser.userId,
      linkedBy: admin.userId,
    }),
  );
  await assert.rejects(
    db.insert(personUserLinks).values({
      personId: person.id,
      userId: viewerUser.userId,
      linkedBy: admin.userId,
    }),
  );
  assert.equal(
    await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(personUserLinks, eq(personUserLinks.userId, users.id))
      .where(eq(personUserLinks.personId, person.id))
      .then((rows) => rows[0]?.id),
    outsiderUser.userId,
  );

  assert.equal(
    await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, "person.create"), eq(auditEvents.targetId, person.id)))
      .then((rows) => rows.length),
    1,
  );
  assert.equal(
    await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, "person.update"), eq(auditEvents.targetId, person.id)))
      .then((rows) => rows.length),
    1,
  );
}
