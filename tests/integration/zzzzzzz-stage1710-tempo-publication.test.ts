import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  addAppProjectMaterialPhysical,
  createAppProjectMaterial,
  createAppProjectNote,
  getAppProjectLibrary,
  getAppProjectNote,
  getProjectWorkspace,
  getPublicNote,
  publishAppDraft,
  publishAppNote,
  requestAppProjectLibraryLoan,
  saveAppNoteDraft,
  toApplicationError,
  transitionAppProjectLibraryLoan,
  unpublishAppNote,
} from "@/modules/application";
import { inviteUser } from "@/modules/auth/admin";
import { grantTmktCore } from "@/modules/auth/core";
import {
  enableProjectCapability,
  grantProjectLibraryOperator,
} from "@/modules/project/capabilities";
import { createProject } from "@/modules/project/service";
import { addSpaceMember } from "@/modules/storage/service";
import { principalFor } from "../setup";

async function failure(action: () => Promise<unknown>) {
  try {
    await action();
    assert.fail("expected operation to fail");
  } catch (error) {
    return toApplicationError(error);
  }
}

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const ordinary = await createProject(admin, {
    name: `Stage 17.10 ordinary ${suffix}`,
    researchLens: "Non-circulation Project",
  });
  const tempo = await createProject(admin, {
    name: `Stage 17.10 Tempo ${suffix}`,
    researchLens: "Physical collection and circulation",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  const operatorEmail = `stage1710-operator-${suffix}@wisdomtree.local`;
  const borrowerEmail = `stage1710-borrower-${suffix}@wisdomtree.local`;
  const coreEmail = `stage1710-core-${suffix}@wisdomtree.local`;
  const neitherEmail = `stage1710-neither-${suffix}@wisdomtree.local`;
  const operatorUser = await inviteUser(manager, {
    email: operatorEmail,
    displayName: "Stage 17.10 operator",
  });
  const borrowerUser = await inviteUser(manager, {
    email: borrowerEmail,
    displayName: "Stage 17.10 borrower",
  });
  const coreUser = await inviteUser(manager, {
    email: coreEmail,
    displayName: "Stage 17.10 Core publisher",
  });
  await inviteUser(manager, {
    email: neitherEmail,
    displayName: "Stage 17.10 neither",
  });
  await addSpaceMember(manager, tempo.id, operatorUser.id, "contributor");
  await addSpaceMember(manager, tempo.id, borrowerUser.id, "viewer");

  const operator = await principalFor(operatorEmail);
  const borrower = await principalFor(borrowerEmail);
  const neither = await principalFor(neitherEmail);

  assert.equal((await getProjectWorkspace(manager, ordinary.id)).modules.library, false);
  assert.equal(
    (await failure(() => getAppProjectLibrary(manager, ordinary.id))).reason,
    "project_capability_required",
  );

  await enableProjectCapability(manager, {
    projectId: tempo.id,
    capability: "library_circulation",
  });
  await grantProjectLibraryOperator(manager, { projectId: tempo.id, userId: operator.userId });
  const physicalMaterial = await createAppProjectMaterial(manager, {
    projectId: tempo.id,
    title: `Stage 17.10 physical holding ${suffix}`,
  });
  await createAppProjectMaterial(manager, {
    projectId: tempo.id,
    title: `Stage 17.10 digital Material ${suffix}`,
  });
  await addAppProjectMaterialPhysical(operator, {
    projectId: tempo.id,
    sourceId: physicalMaterial.id,
    copies: 1,
    location: "Shelf 17.10",
  });

  const borrowerLibrary = await getAppProjectLibrary(borrower, tempo.id);
  assert.equal(borrowerLibrary.holdings.length, 1);
  assert.equal(borrowerLibrary.holdings[0]?.sourceId, physicalMaterial.id);
  assert.equal(borrowerLibrary.capabilities.canRequestLoan, true);
  assert.equal(borrowerLibrary.capabilities.canManageLoans, false);

  await grantTmktCore(manager, coreUser.id);
  const core = await principalFor(coreEmail);
  assert.equal((await getProjectWorkspace(core, tempo.id)).modules.library, false);
  assert.equal((await failure(() => getAppProjectLibrary(core, tempo.id))).error, "not_found");
  assert.equal((await failure(() => getAppProjectLibrary(neither, tempo.id))).error, "not_found");

  const ticket = await requestAppProjectLibraryLoan(borrower, {
    projectId: tempo.id,
    materialId: physicalMaterial.id,
  });
  assert.equal(
    (
      await failure(() =>
        transitionAppProjectLibraryLoan(manager, {
          projectId: tempo.id,
          loanId: ticket.id,
          action: "approve",
        }),
      )
    ).error,
    "forbidden",
  );
  await transitionAppProjectLibraryLoan(operator, {
    projectId: tempo.id,
    loanId: ticket.id,
    action: "approve",
  });
  assert.equal(
    (
      await failure(() =>
        transitionAppProjectLibraryLoan(operator, {
          projectId: tempo.id,
          loanId: ticket.id,
          action: "approve",
        }),
      )
    ).error,
    "invalid_state",
  );
  await transitionAppProjectLibraryLoan(operator, {
    projectId: tempo.id,
    loanId: ticket.id,
    action: "handover",
    dueAt: new Date(Date.now() + 86_400_000),
  });
  await transitionAppProjectLibraryLoan(operator, {
    projectId: tempo.id,
    loanId: ticket.id,
    action: "return",
  });
  assert.equal((await getAppProjectLibrary(operator, tempo.id)).holdings[0]?.availableCopies, 1);

  const draft = await createAppProjectNote(manager, {
    projectId: ordinary.id,
    title: `Stage 17.10 public Note ${suffix}`,
    contentMd: "# Public one\n\nstage1710-public-one",
  });
  const official = await publishAppDraft(manager, draft.id);
  assert.equal(
    (await failure(() => publishAppNote(operator, { noteId: official.nodeId }))).error,
    "forbidden",
  );
  assert.equal(
    (await failure(() => publishAppNote(neither, { noteId: official.nodeId }))).error,
    "forbidden",
  );

  const first = await publishAppNote(core, { noteId: official.nodeId });
  assert.equal(first.revisionNumber, 1);
  const internal = await getAppProjectNote(manager, ordinary.id, official.nodeId);
  const edit = await saveAppNoteDraft(manager, {
    projectId: ordinary.id,
    noteId: official.nodeId,
    title: internal.title,
    summary: internal.summary,
    contentMd: "# Public two\n\nstage1710-public-two",
    tags: internal.tags,
    researchPurpose: internal.researchPurpose,
    baseVersion: internal.currentVersion,
    expectedVersion: 0,
  });
  await publishAppDraft(manager, edit.id);
  assert.equal(
    (await getAppProjectNote(manager, ordinary.id, official.nodeId)).publication.state,
    "published_with_changes",
  );
  assert.match((await getPublicNote(first.slug)).contentMd, /stage1710-public-one/);
  const second = await publishAppNote(core, { noteId: official.nodeId });
  assert.equal(second.revisionNumber, 2);
  const publicNote = await getPublicNote(first.slug);
  assert.match(publicNote.contentMd, /stage1710-public-two/);
  assert.equal(JSON.stringify(publicNote).includes("provenance"), false);
  assert.equal(JSON.stringify(publicNote).includes("activity"), false);

  await grantTmktCore(manager, operatorUser.id);
  const both = await principalFor(operatorEmail);
  assert.equal((await getAppProjectLibrary(both, tempo.id)).capabilities.canManageLoans, true);
  assert.equal((await publishAppNote(both, { noteId: official.nodeId })).changed, false);

  await unpublishAppNote(core, official.nodeId);
  assert.equal(
    (await getAppProjectNote(manager, ordinary.id, official.nodeId)).publication.state,
    "unpublished",
  );
  assert.equal((await failure(() => getPublicNote(first.slug))).error, "not_found");
}
