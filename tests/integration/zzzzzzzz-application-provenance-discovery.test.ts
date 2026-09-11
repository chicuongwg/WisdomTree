import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  addActivityMaterial,
  addActivityNote,
  addActivityParticipant,
  createProjectActivity,
} from "@/modules/activity/service";
import { getAppNoteResearchProvenance } from "@/modules/application";
import { createProjectNote, publishDraft } from "@/modules/knowledge/service";
import { addDraftSupportingNoteVersion, addDraftSupportingSourceVersion } from "@/modules/knowledge/support";
import { treeNodeVersions } from "@/modules/knowledge/schema";
import { createProjectPerson } from "@/modules/person/service";
import { createProject } from "@/modules/project/service";
import { createProjectMaterial } from "@/modules/storage/service";
import { principalFor } from "../setup";

export async function run() {
  const initialActor = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const project = await createProject(initialActor, {
    name: `Provenance composition ${suffix}`,
    researchLens: "Trace exact research provenance",
  });
  const actor = await principalFor("huong@wisdomtree.local");
  const personX = await createProjectPerson(actor, { projectId: project.id, displayName: `X ${suffix}` });
  const personY = await createProjectPerson(actor, { projectId: project.id, displayName: `Y ${suffix}` });
  const activity = await createProjectActivity(actor, {
    projectId: project.id,
    title: `Fieldwork ${suffix}`,
    activityType: "interview",
  });
  await addActivityParticipant(actor, { activityId: activity.id, personId: personX.id, roleLabel: "interviewee" });
  await addActivityParticipant(actor, { activityId: activity.id, personId: personY.id, roleLabel: "researcher" });
  const material = await createProjectMaterial(actor, {
    projectId: project.id,
    title: `Recording ${suffix}`,
    file: new File(["provenance"], "recording.txt", { type: "text/plain" }),
  });
  await addActivityMaterial(actor, { activityId: activity.id, sourceId: material.id });
  const fieldDraft = await createProjectNote(actor, {
    projectId: project.id,
    title: `Field note ${suffix}`,
    contentMd: "Exact field observation.",
  });
  const fieldNote = await publishDraft(actor, fieldDraft.id);
  await addActivityNote(actor, { activityId: activity.id, nodeId: fieldNote.nodeId });
  const [fieldVersion] = await db
    .select({ id: treeNodeVersions.id })
    .from(treeNodeVersions)
    .where(eq(treeNodeVersions.nodeId, fieldNote.nodeId));
  assert.ok(fieldVersion);
  const synthesisDraft = await createProjectNote(actor, {
    projectId: project.id,
    title: `Synthesis ${suffix}`,
    contentMd: "Synthesis based on exact records.",
    researchPurpose: "synthesis",
  });
  await addDraftSupportingSourceVersion(actor, {
    draftId: synthesisDraft.id,
    sourceVersionId: material.currentVersion!.id,
  });
  await addDraftSupportingNoteVersion(actor, { draftId: synthesisDraft.id, noteVersionId: fieldVersion.id });
  const synthesis = await publishDraft(actor, synthesisDraft.id);
  const [synthesisVersion] = await db
    .select({ id: treeNodeVersions.id })
    .from(treeNodeVersions)
    .where(and(eq(treeNodeVersions.nodeId, synthesis.nodeId), eq(treeNodeVersions.seq, 1)));
  assert.ok(synthesisVersion);

  const provenance = await getAppNoteResearchProvenance(actor, synthesisVersion.id);
  assert.equal(provenance.target.project.id, project.id);
  assert.equal(provenance.snapshotStatus, "complete");
  assert.deepEqual(provenance.supportingMaterials.map((item) => item.materialVersion.id), [material.currentVersion!.id]);
  assert.deepEqual(provenance.supportingNotes.map((item) => item.noteVersion.id), [fieldVersion.id]);
  assert.deepEqual(
    provenance.supportingMaterials[0]?.activities[0]?.people.map((person) => person.id).sort(),
    [personX.id, personY.id].sort(),
  );
  assert.equal(provenance.supportingNotes[0]?.activities[0]?.id, activity.id);

  // A legacy supporting NoteVersion can lack a title snapshot. Provenance must
  // preserve that unknown fact rather than borrowing the current Note title.
  const [untitledHistoricalVersion] = await db
    .insert(treeNodeVersions)
    .values({
      nodeId: fieldNote.nodeId,
      seq: 0,
      contentMd: "Historical note without a title snapshot.",
      verification: "unverified",
      createdBy: actor.userId,
      snapshotComplete: true,
      supportSnapshotComplete: false,
    })
    .returning({ id: treeNodeVersions.id });
  const legacyTitleDraft = await createProjectNote(actor, {
    projectId: project.id,
    title: `Legacy title provenance ${suffix}`,
    contentMd: "Use the exact historical NoteVersion.",
  });
  await addDraftSupportingNoteVersion(actor, {
    draftId: legacyTitleDraft.id,
    noteVersionId: untitledHistoricalVersion.id,
  });
  const legacyTitleNote = await publishDraft(actor, legacyTitleDraft.id);
  const [legacyTitleVersion] = await db
    .select({ id: treeNodeVersions.id })
    .from(treeNodeVersions)
    .where(and(eq(treeNodeVersions.nodeId, legacyTitleNote.nodeId), eq(treeNodeVersions.seq, 1)));
  assert.ok(legacyTitleVersion);
  const legacyTitleProvenance = await getAppNoteResearchProvenance(actor, legacyTitleVersion.id);
  assert.equal(legacyTitleProvenance.supportingNotes[0]?.note.title, null);

  const [legacyUnknownVersion] = await db
    .insert(treeNodeVersions)
    .values({
      nodeId: synthesis.nodeId,
      seq: 0,
      title: `Synthesis ${suffix}`,
      contentMd: "Historical compatibility record.",
      verification: "unverified",
      createdBy: actor.userId,
      snapshotComplete: true,
      supportSnapshotComplete: false,
    })
    .returning({ id: treeNodeVersions.id });
  const unknown = await getAppNoteResearchProvenance(actor, legacyUnknownVersion.id);
  assert.equal(unknown.snapshotStatus, "unknown");
  assert.equal(unknown.supportingMaterials.length, 0);
  assert.equal(unknown.supportingNotes.length, 0);
}
