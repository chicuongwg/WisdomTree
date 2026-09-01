import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import { inviteUser } from "@/modules/auth/admin";
import { grantTmktCore } from "@/modules/auth/core";
import {
  approveProjectLoan,
  handoverProjectLoan,
  listProjectLoans,
  requestLoan,
  requestProjectMaterialLoan,
  returnProjectLoan,
} from "@/modules/circulation/service";
import { personUserLinks } from "@/modules/person/schema";
import { createProjectPerson } from "@/modules/person/service";
import {
  disableProjectCapability,
  enableProjectCapability,
  grantProjectLibraryOperator,
  listProjectCapabilities,
  listProjectLibraryOperators,
  revokeProjectLibraryOperator,
} from "@/modules/project/capabilities";
import { projectCapabilities, projectLibraryOperators } from "@/modules/project/schema";
import { createProject } from "@/modules/project/service";
import { searchInternalResearch } from "@/modules/search/service";
import { addProjectMaterialPhysical, createPhysicalItem } from "@/modules/storage/physical";
import { spaceMembers, spaces } from "@/modules/storage/schema";
import {
  addSpaceMember,
  createProjectMaterial,
  listProjectMaterials,
  removeSpaceMember,
} from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const tempoLike = await createProject(admin, {
    name: `Community Archive ${suffix}`,
    researchLens: "Capability-enabled physical research collection",
  });
  const ordinary = await createProject(admin, {
    name: `Tempo by name only ${suffix}`,
    researchLens: "Ordinary research Project",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  const operatorEmail = `stage15-operator-${suffix}@wisdomtree.local`;
  const borrowerEmail = `stage15-borrower-${suffix}@wisdomtree.local`;
  const coreEmail = `stage15-core-${suffix}@wisdomtree.local`;
  const operatorUser = await inviteUser(manager, {
    email: operatorEmail,
    displayName: "Stage 15 operator",
  });
  const borrowerUser = await inviteUser(manager, {
    email: borrowerEmail,
    displayName: "Stage 15 borrower",
  });
  const coreUser = await inviteUser(manager, {
    email: coreEmail,
    displayName: "Stage 15 Core reader",
  });
  await addSpaceMember(manager, tempoLike.id, operatorUser.id, "contributor");
  await addSpaceMember(manager, tempoLike.id, borrowerUser.id, "viewer");
  const operator = await principalFor(operatorEmail);
  const borrower = await principalFor(borrowerEmail);
  const core = await principalFor(coreEmail);

  assert.equal(
    await db
      .select()
      .from(projectCapabilities)
      .where(eq(projectCapabilities.projectId, ordinary.id))
      .then((rows) => rows.length),
    0,
  );
  const enabled = await enableProjectCapability(admin, {
    projectId: tempoLike.id,
    capability: "library_circulation",
  });
  assert.equal(enabled.enabled, true);
  assert.equal(
    (
      await enableProjectCapability(admin, {
        projectId: tempoLike.id,
        capability: "library_circulation",
      })
    ).enabled,
    false,
  );
  assert.deepEqual(await listProjectCapabilities(manager, tempoLike.id), [
    { capability: "library_circulation" },
  ]);

  const [personal] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.type, "personal"));
  const [legacyTeam] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(and(eq(spaces.type, "team"), eq(spaces.name, "Kho Dự Án Cộng Đồng")));
  assert.ok(personal);
  assert.ok(legacyTeam);
  for (const projectId of [personal.id, legacyTeam.id, randomUUID()]) {
    await assert.rejects(
      enableProjectCapability(admin, { projectId, capability: "library_circulation" }),
      errorCode("not_found"),
    );
  }
  await assert.rejects(
    enableProjectCapability(operator, {
      projectId: tempoLike.id,
      capability: "library_circulation",
    }),
    errorCode("forbidden"),
  );

  await assert.rejects(
    grantProjectLibraryOperator(operator, {
      projectId: tempoLike.id,
      userId: operator.userId,
    }),
    errorCode("forbidden"),
  );
  await assert.rejects(
    grantProjectLibraryOperator(manager, {
      projectId: tempoLike.id,
      userId: core.userId,
    }),
    errorCode("not_found"),
  );
  assert.equal(
    await db
      .select()
      .from(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, tempoLike.id), eq(spaceMembers.userId, core.userId)))
      .then((rows) => rows.length),
    0,
  );

  const granted = await grantProjectLibraryOperator(manager, {
    projectId: tempoLike.id,
    userId: operator.userId,
  });
  assert.equal(granted.granted, true);
  assert.equal(
    (
      await grantProjectLibraryOperator(manager, {
        projectId: tempoLike.id,
        userId: operator.userId,
      })
    ).granted,
    false,
  );
  assert.deepEqual(
    (await listProjectLibraryOperators(manager, tempoLike.id)).map((row) => row.userId),
    [operator.userId],
  );

  const person = await createProjectPerson(manager, {
    projectId: tempoLike.id,
    displayName: `Linked identity ${suffix}`,
  });
  await db.insert(personUserLinks).values({
    personId: person.id,
    userId: core.userId,
    linkedBy: manager.userId,
  });
  await grantTmktCore(manager, core.userId);
  assert.equal(
    await db
      .select()
      .from(projectLibraryOperators)
      .where(eq(projectLibraryOperators.userId, core.userId))
      .then((rows) => rows.length),
    0,
  );

  const material = await createProjectMaterial(manager, {
    projectId: tempoLike.id,
    title: `Stage 15 circulating archive ${suffix}`,
    description: "Ordinary Project Material with physical circulation",
  });
  await assert.rejects(
    addProjectMaterialPhysical(manager, {
      projectId: tempoLike.id,
      sourceId: material.id,
      copies: 1,
    }),
    errorCode("forbidden"),
  );
  const physical = await addProjectMaterialPhysical(operator, {
    projectId: tempoLike.id,
    sourceId: material.id,
    copies: 1,
    location: "Shelf C1",
  });
  assert.equal(physical.sourceId, material.id);

  const ordinaryMaterial = await createProjectMaterial(manager, {
    projectId: ordinary.id,
    title: `Ordinary physical attempt ${suffix}`,
  });
  await assert.rejects(
    addProjectMaterialPhysical(operator, {
      projectId: ordinary.id,
      sourceId: ordinaryMaterial.id,
    }),
    errorCode("project_capability_required"),
  );

  const ticket = await requestProjectMaterialLoan(borrower, material.id);
  await assert.rejects(approveProjectLoan(manager, ticket.id), errorCode("forbidden"));
  await assert.rejects(approveProjectLoan(core, ticket.id), errorCode("forbidden"));
  await approveProjectLoan(operator, ticket.id);
  await handoverProjectLoan(operator, ticket.id, new Date(Date.now() + 86_400_000));
  await returnProjectLoan(operator, ticket.id);
  assert.equal((await listProjectLoans(operator, tempoLike.id)).length, 1);
  await assert.rejects(listProjectLoans(core, tempoLike.id), errorCode("forbidden"));

  assert.ok((await listProjectMaterials(core, tempoLike.id)).some((row) => row.sourceId === material.id));
  assert.ok(
    (await searchInternalResearch(core, { query: "circulating archive", types: ["material"] }))
      .some((row) => row.id === material.id),
  );

  const legacyPhysical = await createPhysicalItem(admin, {
    title: `Ordinary legacy physical ${suffix}`,
    spaceId: ordinary.id,
  });
  const ordinaryTicket = await requestLoan(manager, legacyPhysical.sourceId);
  await assert.rejects(
    approveProjectLoan(operator, ordinaryTicket.id),
    errorCode("project_capability_required"),
  );

  assert.equal(
    (
      await revokeProjectLibraryOperator(manager, {
        projectId: tempoLike.id,
        userId: operator.userId,
      })
    ).revoked,
    true,
  );
  await assert.rejects(listProjectLoans(operator, tempoLike.id), errorCode("forbidden"));
  await grantProjectLibraryOperator(manager, {
    projectId: tempoLike.id,
    userId: operator.userId,
  });
  await removeSpaceMember(manager, tempoLike.id, operator.userId);
  assert.equal(
    await db
      .select()
      .from(projectLibraryOperators)
      .where(
        and(
          eq(projectLibraryOperators.projectId, tempoLike.id),
          eq(projectLibraryOperators.userId, operator.userId),
        ),
      )
      .then((rows) => rows.length),
    0,
  );

  assert.equal(
    (
      await disableProjectCapability(admin, {
        projectId: tempoLike.id,
        capability: "library_circulation",
      })
    ).disabled,
    true,
  );
  await assert.rejects(
    requestProjectMaterialLoan(borrower, material.id),
    errorCode("project_capability_required"),
  );
  const auditActions = await db
    .select({ action: auditEvents.action })
    .from(auditEvents)
    .where(eq(auditEvents.targetId, tempoLike.id));
  for (const action of [
    "project.capability.enable",
    "project.capability.disable",
    "project.library_operator.grant",
    "project.library_operator.revoke",
  ]) {
    assert.ok(auditActions.some((row) => row.action === action));
  }
}
