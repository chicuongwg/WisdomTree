import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import {
  addDraftSupportingNoteVersion,
  addDraftSupportingSourceVersion,
  createProjectNote,
  getDraft,
  listDraftSupportingResearch,
  listNoteVersionSupportingResearch,
  publishDraft,
  reviewNodeProposal,
  removeDraftSupportingNoteVersion,
  removeDraftSupportingSourceVersion,
  restoreNodeVersionToDraft,
  saveNodeDraft,
  setNodeProtection,
  submitDraftForReview,
  updateProjectDraftPurpose,
} from "@/modules/knowledge/service";
import {
  draftSupportNoteVersions,
  draftSupportSourceVersions,
  nodeDrafts,
  noteSupportNoteVersions,
  noteSupportSourceVersions,
  noteVersionSupportNoteVersions,
  noteVersionSupportSourceVersions,
  treeNodes,
  treeNodeVersions,
} from "@/modules/knowledge/schema";
import { createProject } from "@/modules/project/service";
import { extractionWorker } from "@/modules/storage/extraction";
import { sourceVersions, sources, spaces } from "@/modules/storage/schema";
import { addSpaceMember, createProjectMaterial, uploadSource } from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

const snapshot = (title: string, contentMd = "Research note.") => ({
  title,
  summary: null,
  sortOrder: 0,
  contentMd,
  tags: [],
  links: [],
});

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("minh@wisdomtree.local");
  const viewerUser = await principalFor("lan@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  const targetProject = await createProject(admin, {
    name: `Research support target ${suffix}`,
    researchLens: "Synthesis lifecycle",
  });
  const supportProject = await createProject(admin, {
    name: `Research support source ${suffix}`,
    researchLens: "Cross-project evidence",
  });
  const inaccessibleProject = await createProject(admin, {
    name: `Research support private ${suffix}`,
    researchLens: "Authorization boundary",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(manager, targetProject.id, contributorUser.userId, "contributor");
  await addSpaceMember(manager, targetProject.id, viewerUser.userId, "viewer");
  await addSpaceMember(manager, supportProject.id, contributorUser.userId, "viewer");
  const contributor = await principalFor("minh@wisdomtree.local");
  const viewer = await principalFor("lan@wisdomtree.local");

  const enqueue = extractionWorker.enqueue;
  extractionWorker.enqueue = () => undefined;
  try {
    const supportingMaterial = await createProjectMaterial(manager, {
      projectId: supportProject.id,
      title: "Supporting interview recording",
      file: new File(["interview"], "interview.txt", { type: "text/plain" }),
    });
    const inaccessibleMaterial = await createProjectMaterial(manager, {
      projectId: inaccessibleProject.id,
      title: "Inaccessible research",
      file: new File(["private"], "private.txt", { type: "text/plain" }),
    });
    const supportingMaterialB = await createProjectMaterial(manager, {
      projectId: supportProject.id,
      title: "Supporting archive transcript",
      file: new File(["archive"], "archive.txt", { type: "text/plain" }),
    });

    const evidenceDraft = await createProjectNote(manager, {
      projectId: supportProject.id,
      title: "Evidence note",
      contentMd: "Evidence version one.",
      researchPurpose: "evidence",
    });
    const evidencePublished = await publishDraft(manager, evidenceDraft.id);
    const [evidenceVersionOne] = await db
      .select()
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, evidencePublished.nodeId));
    assert.ok(evidenceVersionOne);

    const inaccessibleDraft = await createProjectNote(manager, {
      projectId: inaccessibleProject.id,
      title: "Inaccessible evidence note",
      contentMd: "Private evidence.",
    });
    const inaccessiblePublished = await publishDraft(manager, inaccessibleDraft.id);
    const [inaccessibleVersion] = await db
      .select()
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, inaccessiblePublished.nodeId));

    const ordinaryDraft = await createProjectNote(contributor, {
      projectId: targetProject.id,
      title: "Purpose optional",
      contentMd: "Unclassified working note.",
    });
    assert.equal(ordinaryDraft.researchPurpose, null);
    await assert.rejects(
      createProjectNote(contributor, {
        projectId: targetProject.id,
        title: "Invalid purpose",
        contentMd: "Invalid.",
        researchPurpose: "report" as "evidence",
      }),
      errorCode("invalid_research_purpose"),
    );
    await assert.rejects(
      db
        .update(nodeDrafts)
        .set({ researchPurpose: "report" as "evidence" })
        .where(eq(nodeDrafts.id, ordinaryDraft.id)),
    );

    const synthesisDraft = await createProjectNote(contributor, {
      projectId: targetProject.id,
      title: "Cross-project synthesis",
      contentMd: "Working synthesis.",
      researchPurpose: "synthesis",
    });
    assert.equal(
      (
        await addDraftSupportingSourceVersion(contributor, {
          draftId: synthesisDraft.id,
          sourceVersionId: supportingMaterial.currentVersion!.id,
        })
      ).created,
      true,
    );
    assert.equal(
      (
        await addDraftSupportingSourceVersion(contributor, {
          draftId: synthesisDraft.id,
          sourceVersionId: supportingMaterial.currentVersion!.id,
        })
      ).created,
      false,
    );
    await addDraftSupportingNoteVersion(contributor, {
      draftId: synthesisDraft.id,
      noteVersionId: evidenceVersionOne.id,
    });
    await assert.rejects(
      addDraftSupportingSourceVersion(contributor, {
        draftId: synthesisDraft.id,
        sourceVersionId: inaccessibleMaterial.currentVersion!.id,
      }),
      errorCode("not_found"),
    );
    await assert.rejects(
      addDraftSupportingNoteVersion(contributor, {
        draftId: synthesisDraft.id,
        noteVersionId: inaccessibleVersion.id,
      }),
      errorCode("not_found"),
    );
    await assert.rejects(
      listDraftSupportingResearch(viewer, synthesisDraft.id),
      errorCode("not_found"),
    );
    const draftSupport = await listDraftSupportingResearch(contributor, synthesisDraft.id);
    assert.deepEqual(
      draftSupport.sourceVersions.map((item) => item.sourceVersionId),
      [supportingMaterial.currentVersion!.id],
    );
    assert.deepEqual(
      draftSupport.noteVersions.map((item) => item.noteVersionId),
      [evidenceVersionOne.id],
    );

    const synthesisPublished = await publishDraft(contributor, synthesisDraft.id);
    const [synthesisNode] = await db
      .select()
      .from(treeNodes)
      .where(eq(treeNodes.id, synthesisPublished.nodeId));
    const [synthesisVersionOne] = await db
      .select()
      .from(treeNodeVersions)
      .where(and(eq(treeNodeVersions.nodeId, synthesisNode.id), eq(treeNodeVersions.seq, 1)));
    assert.equal(synthesisVersionOne.supportSnapshotComplete, true);
    assert.deepEqual(
      (
        await listNoteVersionSupportingResearch(contributor, synthesisVersionOne.id)
      ).sourceVersions.map((item) => item.sourceVersionId),
      [supportingMaterial.currentVersion!.id],
    );
    assert.deepEqual(
      (
        await listNoteVersionSupportingResearch(contributor, synthesisVersionOne.id)
      ).noteVersions.map((item) => item.noteVersionId),
      [evidenceVersionOne.id],
    );
    assert.equal(
      await db
        .select()
        .from(noteVersionSupportNoteVersions)
        .where(eq(noteVersionSupportNoteVersions.targetNoteVersionId, synthesisVersionOne.id))
        .then((rows) => rows[0]?.supportingNoteVersionId),
      evidenceVersionOne.id,
    );
    await assert.rejects(
      db
        .delete(noteVersionSupportSourceVersions)
        .where(eq(noteVersionSupportSourceVersions.targetNoteVersionId, synthesisVersionOne.id)),
    );
    await assert.rejects(
      db.insert(noteVersionSupportSourceVersions).values({
        targetNoteVersionId: synthesisVersionOne.id,
        sourceVersionId: supportingMaterialB.currentVersion!.id,
        createdBy: contributor.userId,
      }),
    );
    assert.equal(synthesisNode.researchPurpose, "synthesis");
    assert.equal(
      await db
        .select()
        .from(noteSupportSourceVersions)
        .where(eq(noteSupportSourceVersions.nodeId, synthesisNode.id))
        .then((rows) => rows.length),
      1,
    );
    assert.equal(
      await db
        .select()
        .from(noteSupportNoteVersions)
        .where(eq(noteSupportNoteVersions.nodeId, synthesisNode.id))
        .then((rows) => rows[0]?.noteVersionId),
      evidenceVersionOne.id,
    );
    assert.equal(
      await db
        .select()
        .from(draftSupportSourceVersions)
        .where(eq(draftSupportSourceVersions.draftId, synthesisDraft.id))
        .then((rows) => rows.length),
      0,
    );

    const editDraft = await saveNodeDraft(contributor, synthesisNode.id, "vi", {
      ...snapshot("Cross-project synthesis", "Edited synthesis."),
      baseVersion: 1,
      expectedDraftVersion: 0,
    });
    assert.equal(editDraft.researchPurpose, "synthesis");
    assert.equal(
      await db
        .select()
        .from(draftSupportNoteVersions)
        .where(eq(draftSupportNoteVersions.draftId, editDraft.id))
        .then((rows) => rows.length),
      1,
    );
    await removeDraftSupportingSourceVersion(contributor, {
      draftId: editDraft.id,
      sourceVersionId: supportingMaterial.currentVersion!.id,
    });
    await addDraftSupportingSourceVersion(contributor, {
      draftId: editDraft.id,
      sourceVersionId: supportingMaterialB.currentVersion!.id,
    });
    const purposeDraft = await updateProjectDraftPurpose(contributor, {
      draftId: editDraft.id,
      researchPurpose: null,
      expectedDraftVersion: editDraft.draftVersion,
    });
    await publishDraft(contributor, purposeDraft.id);
    const [synthesisVersionTwo] = await db
      .select()
      .from(treeNodeVersions)
      .where(and(eq(treeNodeVersions.nodeId, synthesisNode.id), eq(treeNodeVersions.seq, 2)));
    assert.equal(synthesisVersionTwo.supportSnapshotComplete, true);
    assert.deepEqual(
      (
        await listNoteVersionSupportingResearch(contributor, synthesisVersionOne.id)
      ).sourceVersions.map((item) => item.sourceVersionId),
      [supportingMaterial.currentVersion!.id],
    );
    assert.deepEqual(
      (
        await listNoteVersionSupportingResearch(contributor, synthesisVersionTwo.id)
      ).sourceVersions.map((item) => item.sourceVersionId),
      [supportingMaterialB.currentVersion!.id],
    );
    assert.equal(
      await db
        .select()
        .from(noteSupportSourceVersions)
        .where(eq(noteSupportSourceVersions.nodeId, synthesisNode.id))
        .then((rows) => rows.length),
      1,
    );
    assert.equal(
      await db
        .select()
        .from(noteSupportNoteVersions)
        .where(eq(noteSupportNoteVersions.nodeId, synthesisNode.id))
        .then((rows) => rows[0]?.noteVersionId),
      evidenceVersionOne.id,
    );
    assert.equal(
      await db
        .select({ purpose: treeNodes.researchPurpose })
        .from(treeNodes)
        .where(eq(treeNodes.id, synthesisNode.id))
        .then((rows) => rows[0]?.purpose),
      null,
    );

    const emptyDraft = await saveNodeDraft(contributor, synthesisNode.id, "vi", {
      ...snapshot("Cross-project synthesis", "Known empty evidence set."),
      baseVersion: 2,
      expectedDraftVersion: 0,
    });
    await removeDraftSupportingSourceVersion(contributor, {
      draftId: emptyDraft.id,
      sourceVersionId: supportingMaterialB.currentVersion!.id,
    });
    await removeDraftSupportingNoteVersion(contributor, {
      draftId: emptyDraft.id,
      noteVersionId: evidenceVersionOne.id,
    });
    await publishDraft(contributor, emptyDraft.id);
    const [synthesisVersionThree] = await db
      .select()
      .from(treeNodeVersions)
      .where(and(eq(treeNodeVersions.nodeId, synthesisNode.id), eq(treeNodeVersions.seq, 3)));
    const emptySupport = await listNoteVersionSupportingResearch(
      contributor,
      synthesisVersionThree.id,
    );
    assert.equal(emptySupport.snapshotStatus, "complete");
    assert.deepEqual(emptySupport.sourceVersions, []);
    assert.deepEqual(emptySupport.noteVersions, []);

    const restored = await restoreNodeVersionToDraft(contributor, synthesisNode.id, 1);
    const restoredSupport = await listDraftSupportingResearch(contributor, restored.draft.id);
    assert.deepEqual(
      restoredSupport.sourceVersions.map((item) => item.sourceVersionId),
      [supportingMaterial.currentVersion!.id],
    );
    assert.deepEqual(
      restoredSupport.noteVersions.map((item) => item.noteVersionId),
      [evidenceVersionOne.id],
    );
    const [unknownVersion] = await db
      .insert(treeNodeVersions)
      .values({
        nodeId: synthesisNode.id,
        seq: 0,
        contentMd: "Legacy content with unknown evidence.",
        verification: "unverified",
        createdBy: contributor.userId,
        changeSummary: "legacy_unknown_fixture",
        title: "Cross-project synthesis",
        snapshotComplete: true,
        supportSnapshotComplete: false,
      })
      .returning();
    assert.equal(
      (await listNoteVersionSupportingResearch(contributor, unknownVersion.id)).snapshotStatus,
      "unknown",
    );
    await assert.rejects(
      restoreNodeVersionToDraft(contributor, synthesisNode.id, 0),
      errorCode("historical_support_unavailable"),
    );
    assert.deepEqual(
      (await listDraftSupportingResearch(contributor, restored.draft.id)).sourceVersions.map(
        (item) => item.sourceVersionId,
      ),
      [supportingMaterial.currentVersion!.id],
    );

    const evidenceEdit = await saveNodeDraft(manager, evidencePublished.nodeId, "vi", {
      ...snapshot("Evidence note", "Evidence version two."),
      baseVersion: 1,
      expectedDraftVersion: 0,
    });
    await publishDraft(manager, evidenceEdit.id);
    const evidenceVersions = await db
      .select()
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, evidencePublished.nodeId));
    assert.equal(evidenceVersions.length, 2);
    assert.equal(
      (await listNoteVersionSupportingResearch(contributor, synthesisVersionTwo.id)).noteVersions[0]
        ?.noteVersionId,
      evidenceVersionOne.id,
    );
    assert.equal(
      (await listNoteVersionSupportingResearch(viewer, synthesisVersionTwo.id)).noteVersions.length,
      0,
    );

    const selfDraft = restored.draft;
    const [synthesisVersion] = await db
      .select()
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, synthesisNode.id));
    await assert.rejects(
      addDraftSupportingNoteVersion(contributor, {
        draftId: selfDraft.id,
        noteVersionId: synthesisVersion.id,
      }),
      errorCode("self_support"),
    );

    const [legacyNoteVersion] = await db
      .select({ id: treeNodeVersions.id })
      .from(treeNodeVersions)
      .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
      .where(sql`${treeNodes.projectId} IS NULL`)
      .limit(1);
    assert.ok(legacyNoteVersion);
    await assert.rejects(
      addDraftSupportingNoteVersion(contributor, {
        draftId: selfDraft.id,
        noteVersionId: legacyNoteVersion.id,
      }),
      errorCode("not_found"),
    );

    const protectedDraft = await createProjectNote(contributor, {
      projectId: targetProject.id,
      title: "Reviewed synthesis",
      contentMd: "Initial reviewed note.",
    });
    await addDraftSupportingSourceVersion(contributor, {
      draftId: protectedDraft.id,
      sourceVersionId: supportingMaterial.currentVersion!.id,
    });
    const protectedPublished = await publishDraft(contributor, protectedDraft.id);
    await setNodeProtection(manager, protectedPublished.nodeId, true);
    const reviewedEdit = await saveNodeDraft(contributor, protectedPublished.nodeId, "vi", {
      ...snapshot("Reviewed synthesis", "Reviewed edit."),
      baseVersion: 2,
      expectedDraftVersion: 0,
    });
    const submitted = await submitDraftForReview(contributor, reviewedEdit.id);
    assert.equal(
      (await listDraftSupportingResearch(contributor, reviewedEdit.id)).sourceVersions[0]
        ?.sourceVersionId,
      supportingMaterial.currentVersion!.id,
    );
    await reviewNodeProposal(manager, protectedPublished.nodeId, submitted.proposalId, {
      decision: "approved",
      verification: "verified",
    });
    assert.equal(
      await db
        .select()
        .from(noteSupportSourceVersions)
        .where(eq(noteSupportSourceVersions.nodeId, protectedPublished.nodeId))
        .then((rows) => rows[0]?.sourceVersionId),
      supportingMaterial.currentVersion!.id,
    );
    const reviewedVersions = await db
      .select()
      .from(treeNodeVersions)
      .where(eq(treeNodeVersions.nodeId, protectedPublished.nodeId));
    assert.equal(
      reviewedVersions.every((version) => version.supportSnapshotComplete),
      true,
    );
    const reviewedVersion = reviewedVersions.find((version) => version.seq === 3)!;
    assert.equal(
      await db
        .select()
        .from(noteVersionSupportSourceVersions)
        .where(eq(noteVersionSupportSourceVersions.targetNoteVersionId, reviewedVersion.id))
        .then((rows) => rows[0]?.sourceVersionId),
      supportingMaterial.currentVersion!.id,
    );

    const [legacySpace] = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.name, "Kho Dự Án Cộng Đồng"));
    const legacy = await uploadSource(admin, {
      spaceId: legacySpace.id,
      title: `Legacy support ${suffix}`,
      file: new File(["legacy"], "legacy.txt", { type: "text/plain" }),
    });
    const [legacyVersion] = await db
      .select()
      .from(sourceVersions)
      .where(eq(sourceVersions.sourceId, legacy.id));
    await assert.rejects(
      addDraftSupportingSourceVersion(contributor, {
        draftId: selfDraft.id,
        sourceVersionId: legacyVersion.id,
      }),
      errorCode("not_found"),
    );

    const rollbackDraft = await createProjectNote(contributor, {
      projectId: targetProject.id,
      title: "Atomic support transfer",
      contentMd: "Must remain a draft.",
    });
    await addDraftSupportingSourceVersion(contributor, {
      draftId: rollbackDraft.id,
      sourceVersionId: supportingMaterial.currentVersion!.id,
    });
    await db.execute(sql`
      CREATE FUNCTION stage9_force_support_failure() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'stage9 forced support failure'; END;
      $$ LANGUAGE plpgsql
    `);
    await db.execute(sql`
      CREATE TRIGGER stage9_force_support_failure
      BEFORE INSERT ON note_support_source_versions
      FOR EACH ROW EXECUTE FUNCTION stage9_force_support_failure()
    `);
    try {
      await assert.rejects(publishDraft(contributor, rollbackDraft.id));
    } finally {
      await db.execute(
        sql`DROP TRIGGER stage9_force_support_failure ON note_support_source_versions`,
      );
      await db.execute(sql`DROP FUNCTION stage9_force_support_failure()`);
    }
    assert.equal((await getDraft(contributor, rollbackDraft.id)).id, rollbackDraft.id);
    assert.equal(
      await db
        .select()
        .from(treeNodes)
        .where(eq(treeNodes.title, "Atomic support transfer"))
        .then((rows) => rows.length),
      0,
    );
  } finally {
    extractionWorker.enqueue = enqueue;
  }
}
