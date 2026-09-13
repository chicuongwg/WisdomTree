import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { verifyDownload } from "@/lib/sign";
import {
  addAppProjectMaterialPhysical,
  addAppProjectMaterialVersion,
  addAppProjectMember,
  archiveAppProjectMaterialPhysical,
  createAppProject,
  createAppProjectMaterial,
  createAppProjectPerson,
  enableAppProjectCapability,
  getAppProjectMaterialVersionDownloadToken,
  getProjectWorkspace,
  grantAppProjectLibraryOperator,
  listAppProjectMembers,
  listAppProjects,
  removeAppProjectMember,
  updateAppProject,
  updateAppProjectMaterialPhysical,
  updateAppProjectMemberRole,
} from "@/modules/application";
import { ApiError } from "@/lib/errors";
import { persons } from "@/modules/person/schema";
import { projects } from "@/modules/project/schema";
import { sourcePhysical, sourceVersions, spaceMembers, spaces } from "@/modules/storage/schema";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const editor = await principalFor("minh@wisdomtree.local");
  const member = await principalFor("lan@wisdomtree.local");
  const outsider = await principalFor("duc@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  // Target Project creation retains the canonical Project + team-Space identity
  // and creator manager membership; it does not grant any new global role.
  const project = await createAppProject(admin, {
    name: `PR1 governance ${suffix}`,
    researchLens: "Target governance and source-version retrieval",
  });
  assert.equal(project.version, 1);
  const [space, extension, creatorMembership] = await Promise.all([
    db
      .select()
      .from(spaces)
      .where(eq(spaces.id, project.id))
      .then((rows) => rows[0]),
    db
      .select()
      .from(projects)
      .where(eq(projects.projectId, project.id))
      .then((rows) => rows[0]),
    db
      .select()
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, project.id), eq(spaceMembers.userId, admin.userId)))
      .then((rows) => rows[0]),
  ]);
  assert.equal(space?.type, "team");
  assert.equal(extension?.projectId, project.id);
  assert.equal(creatorMembership?.memberRole, "manager");
  assert.equal((await principalFor("huong@wisdomtree.local")).role, "admin_op");
  assert.ok((await listAppProjects(admin)).some((item) => item.id === project.id));
  const initialManager = await principalFor("huong@wisdomtree.local");
  await assert.rejects(
    removeAppProjectMember(initialManager, { projectId: project.id, userId: admin.userId }),
    errorCode("project_requires_manager"),
  );
  await assert.rejects(
    updateAppProjectMemberRole(initialManager, {
      projectId: project.id,
      userId: admin.userId,
      memberRole: "contributor",
    }),
    errorCode("project_requires_manager"),
  );
  await assert.rejects(
    createAppProject(editor, { name: `Denied ${suffix}`, researchLens: "No policy expansion" }),
    errorCode("forbidden"),
  );

  // Project membership is an authenticated-user capability, never a mutation
  // of the separate research-Person collection.
  const manager = await principalFor("huong@wisdomtree.local");
  const researchPerson = await createAppProjectPerson(manager, {
    projectId: project.id,
    displayName: `Research Person ${suffix}`,
  });
  await addAppProjectMember(manager, {
    projectId: project.id,
    userId: member.userId,
    memberRole: "viewer",
  });
  const viewer = await principalFor("lan@wisdomtree.local");
  assert.ok((await listAppProjects(viewer)).some((item) => item.id === project.id));
  await updateAppProjectMemberRole(manager, {
    projectId: project.id,
    userId: member.userId,
    memberRole: "contributor",
  });
  const contributor = await principalFor("lan@wisdomtree.local");
  assert.equal(
    (await getProjectWorkspace(contributor, project.id)).project.capabilities.canCreateMaterial,
    true,
  );
  await removeAppProjectMember(manager, { projectId: project.id, userId: member.userId });
  const removed = await principalFor("lan@wisdomtree.local");
  assert.equal(
    (await listAppProjects(removed)).some((item) => item.id === project.id),
    false,
  );
  assert.ok(
    await db
      .select({ id: persons.id })
      .from(persons)
      .where(eq(persons.id, researchPerson.id))
      .then((rows) => rows[0]),
  );
  await addAppProjectMember(manager, {
    projectId: project.id,
    userId: editor.userId,
    memberRole: "contributor",
  });
  const projectContributor = await principalFor("minh@wisdomtree.local");
  await assert.rejects(
    addAppProjectMember(projectContributor, { projectId: project.id, userId: member.userId }),
    errorCode("forbidden"),
  );
  await updateAppProjectMemberRole(manager, {
    projectId: project.id,
    userId: editor.userId,
    memberRole: "manager",
  });
  const scopedManager = await principalFor("minh@wisdomtree.local");
  const managerUpdate = await updateAppProject(scopedManager, project.id, {
    description: "Managed by an in-Project manager",
    expectedVersion: project.version!,
  });
  assert.equal(managerUpdate.description, "Managed by an in-Project manager");
  await addAppProjectMember(scopedManager, {
    projectId: project.id,
    userId: member.userId,
    memberRole: "viewer",
  });
  assert.equal(
    (await listAppProjectMembers(manager, project.id)).some(
      (item) => item.userId === member.userId,
    ),
    true,
  );

  // The selected immutable SourceVersion, not whichever version is current,
  // is what the target download token represents.
  const material = await createAppProjectMaterial(manager, {
    projectId: project.id,
    title: `Source versions ${suffix}`,
    file: new File(["first original"], "first.txt", { type: "text/plain" }),
  });
  const firstVersionId = material.currentVersion!.id;
  const revised = await addAppProjectMaterialVersion(manager, {
    projectId: project.id,
    materialId: material.id,
    file: new File(["second original"], "second.txt", { type: "text/plain" }),
  });
  const secondVersionId = revised.currentVersion!.id;
  const [firstVersion] = await db
    .select({ originalObjectKey: sourceVersions.originalObjectKey })
    .from(sourceVersions)
    .where(eq(sourceVersions.id, firstVersionId));
  const firstGrant = verifyDownload(
    await getAppProjectMaterialVersionDownloadToken(manager, {
      projectId: project.id,
      materialId: material.id,
      sourceVersionId: firstVersionId,
    }),
  );
  assert.equal(firstGrant?.objectKey, firstVersion.originalObjectKey);
  await assert.rejects(
    getAppProjectMaterialVersionDownloadToken(outsider, {
      projectId: project.id,
      materialId: material.id,
      sourceVersionId: firstVersionId,
    }),
    errorCode("not_found"),
  );
  const otherMaterial = await createAppProjectMaterial(manager, {
    projectId: project.id,
    title: `Other immutable SourceVersion ${suffix}`,
    file: new File(["other original"], "other.txt", { type: "text/plain" }),
  });
  await assert.rejects(
    getAppProjectMaterialVersionDownloadToken(manager, {
      projectId: project.id,
      materialId: material.id,
      sourceVersionId: otherMaterial.currentVersion!.id,
    }),
    errorCode("not_found"),
  );
  const otherProject = await createAppProject(manager, {
    name: `PR1 other Project ${suffix}`,
    researchLens: "Cross-Project immutable source isolation",
  });
  await assert.rejects(
    getAppProjectMaterialVersionDownloadToken(manager, {
      projectId: otherProject.id,
      materialId: material.id,
      sourceVersionId: firstVersionId,
    }),
    errorCode("not_found"),
  );
  await assert.rejects(
    getAppProjectMaterialVersionDownloadToken(manager, {
      projectId: project.id,
      materialId: material.id,
      sourceVersionId: randomUUID(),
    }),
    errorCode("not_found"),
  );
  assert.notEqual(firstVersionId, secondVersionId);

  // Library operators, not ordinary Project managers, maintain the physical
  // facts. The target facade preserves the established archive invariant.
  await enableAppProjectCapability(manager, {
    projectId: project.id,
    capability: "library_circulation",
  });
  await grantAppProjectLibraryOperator(manager, { projectId: project.id, userId: manager.userId });
  const physicalMaterial = await createAppProjectMaterial(manager, {
    projectId: project.id,
    title: `Physical holding ${suffix}`,
  });
  await addAppProjectMaterialPhysical(manager, {
    projectId: project.id,
    sourceId: physicalMaterial.id,
    copies: 2,
    location: "Shelf PR1",
  });
  const updatedPhysical = await updateAppProjectMaterialPhysical(manager, {
    projectId: project.id,
    materialId: physicalMaterial.id,
    copies: 3,
    author: "PR1 cataloguer",
  });
  assert.equal(updatedPhysical.copies, 3);
  await assert.rejects(
    updateAppProjectMaterialPhysical(editor, {
      projectId: project.id,
      materialId: physicalMaterial.id,
      copies: 4,
    }),
    errorCode("forbidden"),
  );
  await archiveAppProjectMaterialPhysical(manager, {
    projectId: project.id,
    materialId: physicalMaterial.id,
  });
  assert.ok(
    await db
      .select({ archivedAt: sourcePhysical.archivedAt })
      .from(sourcePhysical)
      .where(eq(sourcePhysical.sourceId, physicalMaterial.id))
      .then((rows) => rows[0]?.archivedAt),
  );
}
