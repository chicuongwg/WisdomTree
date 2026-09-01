import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import {
  grantTmktCore,
  hasTmktCoreCapability,
  listTmktCoreMembers,
  revokeTmktCore,
} from "@/modules/auth/core";
import { inviteUser } from "@/modules/auth/admin";
import { tmktCoreMembers } from "@/modules/auth/schema";
import {
  addActivityMaterial,
  addActivityNote,
  addActivityParticipant,
  createProjectActivity,
  getActivity,
  listProjectActivities,
} from "@/modules/activity/service";
import {
  addDraftSupportingNoteVersion,
  addDraftSupportingSourceVersion,
  createNode,
  createProjectNote,
  getDraft,
  getNode,
  listDraftSupportingResearch,
  listNoteSupportingResearch,
  listProjectNotes,
  publishDraft,
} from "@/modules/knowledge/service";
import { branches, treeNodeVersions } from "@/modules/knowledge/schema";
import {
  createProjectPerson,
  getPerson,
  listProjectPeople,
  searchAccessiblePeople,
  updatePerson,
} from "@/modules/person/service";
import { personUserLinks } from "@/modules/person/schema";
import { createProjectTask, listProjectTasks } from "@/modules/pm/service";
import { createProject, getProject, listProjects, updateProject } from "@/modules/project/service";
import { evolveCandidateIntoProjectNote } from "@/modules/storage/candidates";
import { extractionWorker } from "@/modules/storage/extraction";
import { extractionCandidates, sourceVersions, spaceMembers } from "@/modules/storage/schema";
import {
  addProjectMaterialVersion,
  addSpaceMember,
  createProjectMaterial,
  getDownloadToken,
  getSourceDetail,
  listProjectMaterials,
} from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  assert.equal((await db.select().from(tmktCoreMembers)).length, 0);

  const admin = await principalFor("huong@wisdomtree.local");
  const editor = await principalFor("minh@wisdomtree.local");
  const projectMember = await principalFor("duc@wisdomtree.local");
  for (const actor of [admin, editor, projectMember]) {
    assert.equal(await hasTmktCoreCapability(actor, "tmkt.research.read_all"), false);
  }

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const coreEmail = `stage12-core-${suffix}@wisdomtree.local`;
  const coreUser = await inviteUser(admin, {
    email: coreEmail,
    displayName: "Stage 12 Core fixture",
    role: "user",
  });
  const projectA = await createProject(admin, {
    name: `Core member Project A ${suffix}`,
    researchLens: "Operational participation",
  });
  const projectB = await createProject(admin, {
    name: `Core research Project B ${suffix}`,
    researchLens: "Cross-Project research read",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(manager, projectA.id, coreUser.id, "contributor");
  const coreActor = await principalFor(coreEmail);
  assert.equal(await hasTmktCoreCapability(manager, "tmkt.research.read_all"), false);

  const enqueue = extractionWorker.enqueue;
  extractionWorker.enqueue = () => undefined;
  try {
    const materialB = await createProjectMaterial(manager, {
      projectId: projectB.id,
      title: "Project B interview transcript",
      file: new File(["Project B evidence"], "project-b.txt", { type: "text/plain" }),
    });
    assert.ok(materialB.currentVersion);
    const [materialVersionB] = await db
      .select()
      .from(sourceVersions)
      .where(eq(sourceVersions.id, materialB.currentVersion.id));

    const noteDraftB = await createProjectNote(manager, {
      projectId: projectB.id,
      title: "Project B official research",
      contentMd: "# Project B research\n\nInternal official research.",
    });
    const publishedB = await publishDraft(manager, noteDraftB.id);
    const [noteVersionB] = await db
      .select()
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, publishedB.nodeId));
    const privateDraftB = await createProjectNote(manager, {
      projectId: projectB.id,
      title: "Project B private working draft",
      contentMd: "Private working content.",
    });
    const personB = await createProjectPerson(manager, {
      projectId: projectB.id,
      displayName: "Project B research subject",
    });
    await db.insert(personUserLinks).values({
      personId: personB.id,
      userId: coreActor.userId,
      linkedBy: manager.userId,
    });
    assert.equal(await hasTmktCoreCapability(coreActor, "tmkt.research.read_all"), false);

    const activityB = await createProjectActivity(manager, {
      projectId: projectB.id,
      title: "Project B interview",
      activityType: "interview",
    });
    const taskB = await createProjectTask(manager, {
      projectId: projectB.id,
      title: "Project B operational task",
    });
    assert.ok(taskB.id);
    const [personalBranch] = await db
      .select()
      .from(branches)
      .where(and(eq(branches.scope, "personal"), eq(branches.ownerUserId, manager.userId)));
    const personalNode = await createNode(manager, {
      branchId: personalBranch.id,
      title: `Private Core guard ${suffix}`,
      contentMd: "Personal research stays private.",
    });
    const [candidateB] = await db
      .insert(extractionCandidates)
      .values({
        sourceVersionId: materialVersionB.id,
        contentMd: "# Extracted Project B evidence",
        contentSha256: createHash("sha256").update("# Extracted Project B evidence").digest("hex"),
        method: "text",
        createdBy: manager.userId,
      })
      .returning();

    // System administration and the editor role do not become research access.
    await db
      .delete(spaceMembers)
      .where(and(eq(spaceMembers.spaceId, projectB.id), eq(spaceMembers.userId, manager.userId)));
    await assert.rejects(getProject(manager, projectB.id), errorCode("not_found"));
    await assert.rejects(getProject(editor, projectB.id), errorCode("not_found"));

    const synthesisDraftA = await createProjectNote(coreActor, {
      projectId: projectA.id,
      title: "Project A cross-Project synthesis",
      contentMd: "# Working synthesis",
      researchPurpose: "synthesis",
    });

    await assert.rejects(getProject(coreActor, projectB.id), errorCode("not_found"));
    await assert.rejects(
      addDraftSupportingSourceVersion(coreActor, {
        draftId: synthesisDraftA.id,
        sourceVersionId: materialVersionB.id,
      }),
      errorCode("not_found"),
    );
    await assert.rejects(grantTmktCore(coreActor, coreActor.userId), errorCode("forbidden"));

    const membershipsBefore = await db
      .select()
      .from(spaceMembers)
      .where(eq(spaceMembers.userId, coreActor.userId));
    assert.equal(
      membershipsBefore.some((row) => row.spaceId === projectB.id),
      false,
    );

    const granted = await grantTmktCore(manager, coreActor.userId);
    assert.equal(granted.granted, true);
    assert.equal((await grantTmktCore(manager, coreActor.userId)).granted, false);
    for (const capability of [
      "tmkt.research.read_all",
      "tmkt.research.curate",
      "tmkt.publish",
    ] as const) {
      assert.equal(await hasTmktCoreCapability(coreActor, capability), true);
    }
    assert.deepEqual(
      (await listTmktCoreMembers(manager)).map((row) => row.userId),
      [coreActor.userId],
    );
    await assert.rejects(listTmktCoreMembers(coreActor), errorCode("not_found"));

    assert.equal((await getProject(coreActor, projectB.id)).id, projectB.id);
    const visibleProjects = await listProjects(coreActor);
    assert.ok(visibleProjects.some((project) => project.id === projectA.id));
    assert.ok(visibleProjects.some((project) => project.id === projectB.id));

    const notesB = await listProjectNotes(coreActor, projectB.id);
    assert.ok(notesB.notes.some((note) => note.id === publishedB.nodeId));
    assert.deepEqual(notesB.drafts, []);
    await assert.rejects(getDraft(coreActor, privateDraftB.id), errorCode("not_found"));
    await assert.rejects(getNode(coreActor, personalNode.id), errorCode("not_found"));

    assert.ok(
      (await listProjectMaterials(coreActor, projectB.id)).some(
        (material) => material.sourceId === materialB.id,
      ),
    );
    assert.equal((await getSourceDetail(coreActor, materialB.id)).id, materialB.id);
    assert.equal(typeof (await getDownloadToken(coreActor, materialB.id)), "string");
    assert.ok(
      (await listProjectPeople(coreActor, projectB.id)).some((row) => row.id === personB.id),
    );
    assert.equal((await getPerson(coreActor, personB.id)).id, personB.id);
    assert.ok(
      (await searchAccessiblePeople(coreActor, "research subject")).some(
        (row) => row.id === personB.id,
      ),
    );
    await assert.rejects(
      updatePerson(coreActor, {
        personId: personB.id,
        displayName: "Core cannot edit without Project participation",
        expectedVersion: personB.version,
      }),
      errorCode("forbidden"),
    );

    assert.equal(
      (
        await addDraftSupportingSourceVersion(coreActor, {
          draftId: synthesisDraftA.id,
          sourceVersionId: materialVersionB.id,
        })
      ).created,
      true,
    );
    assert.equal(
      (
        await addDraftSupportingNoteVersion(coreActor, {
          draftId: synthesisDraftA.id,
          noteVersionId: noteVersionB.id,
        })
      ).created,
      true,
    );
    const draftSupport = await listDraftSupportingResearch(coreActor, synthesisDraftA.id);
    assert.ok(draftSupport.sourceVersions.some((row) => row.projectId === projectB.id));
    assert.ok(draftSupport.noteVersions.some((row) => row.projectId === projectB.id));
    const publishedA = await publishDraft(coreActor, synthesisDraftA.id);
    const noteSupport = await listNoteSupportingResearch(coreActor, publishedA.nodeId);
    assert.ok(noteSupport.sourceVersions.some((row) => row.projectId === projectB.id));
    assert.ok(noteSupport.noteVersions.some((row) => row.projectId === projectB.id));

    await assert.rejects(
      createProjectTask(coreActor, { projectId: projectB.id, title: "Denied Core Task" }),
      errorCode("forbidden"),
    );
    await assert.rejects(listProjectTasks(coreActor, projectB.id), errorCode("not_found"));
    await assert.rejects(
      createProjectActivity(coreActor, { projectId: projectB.id, title: "Denied Activity" }),
      errorCode("not_found"),
    );
    await assert.rejects(getActivity(coreActor, activityB.id), errorCode("not_found"));
    await assert.rejects(listProjectActivities(coreActor, projectB.id), errorCode("not_found"));
    await assert.rejects(
      createProjectMaterial(coreActor, { projectId: projectB.id, title: "Denied Material" }),
      errorCode("forbidden"),
    );
    await assert.rejects(
      addProjectMaterialVersion(coreActor, {
        projectId: projectB.id,
        sourceId: materialB.id,
        file: new File(["denied"], "denied.txt", { type: "text/plain" }),
      }),
      errorCode("forbidden"),
    );
    await assert.rejects(
      createProjectNote(coreActor, {
        projectId: projectB.id,
        title: "Denied Project Note",
        contentMd: "No operational participation.",
      }),
      errorCode("forbidden"),
    );
    await assert.rejects(
      evolveCandidateIntoProjectNote(coreActor, { candidateId: candidateB.id }),
      errorCode("not_found"),
    );
    await assert.rejects(
      updateProject(coreActor, projectB.id, {
        description: "Denied Project management",
        expectedVersion: projectB.version,
      }),
      errorCode("forbidden"),
    );
    await assert.rejects(
      addActivityParticipant(coreActor, { activityId: activityB.id, personId: personB.id }),
      errorCode("not_found"),
    );
    await assert.rejects(
      addActivityMaterial(coreActor, { activityId: activityB.id, sourceId: materialB.id }),
      errorCode("not_found"),
    );
    await assert.rejects(
      addActivityNote(coreActor, { activityId: activityB.id, nodeId: publishedB.nodeId }),
      errorCode("not_found"),
    );

    const operationalA = await createProjectTask(coreActor, {
      projectId: projectA.id,
      title: "Membership-backed operational Task",
    });
    assert.equal(operationalA.projectId, projectA.id);
    assert.equal(
      (await db.select().from(spaceMembers).where(eq(spaceMembers.userId, coreActor.userId))).some(
        (row) => row.spaceId === projectB.id,
      ),
      false,
    );

    assert.equal((await revokeTmktCore(manager, coreActor.userId)).revoked, true);
    assert.equal(await hasTmktCoreCapability(coreActor, "tmkt.research.read_all"), false);
    await assert.rejects(getProject(coreActor, projectB.id), errorCode("not_found"));
    await assert.rejects(listProjectNotes(coreActor, projectB.id), errorCode("not_found"));
    await assert.rejects(listProjectMaterials(coreActor, projectB.id), errorCode("not_found"));
    await assert.rejects(getPerson(coreActor, personB.id), errorCode("not_found"));
    const supportAfterRevoke = await listNoteSupportingResearch(coreActor, publishedA.nodeId);
    assert.deepEqual(supportAfterRevoke.sourceVersions, []);
    assert.deepEqual(supportAfterRevoke.noteVersions, []);
    assert.equal(
      (
        await createProjectTask(coreActor, {
          projectId: projectA.id,
          title: "Membership survives Core revocation",
        })
      ).projectId,
      projectA.id,
    );

    const coreAudit = await db
      .select({ action: auditEvents.action, targetId: auditEvents.targetId })
      .from(auditEvents)
      .where(and(eq(auditEvents.targetId, coreActor.userId), eq(auditEvents.targetType, "user")));
    assert.equal(coreAudit.filter((row) => row.action === "tmkt.core.grant").length, 1);
    assert.equal(coreAudit.filter((row) => row.action === "tmkt.core.revoke").length, 1);
    assert.equal((await db.select().from(tmktCoreMembers)).length, 0);
  } finally {
    extractionWorker.enqueue = enqueue;
  }
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
