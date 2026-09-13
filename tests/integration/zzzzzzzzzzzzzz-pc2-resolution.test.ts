import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import {
  addAppProjectMember,
  createAppProject,
  createAppProjectExport,
  createAppProjectMaterial,
  createAppProjectNote,
  getAppProjectNoteHistoryVersion,
  getAppProjectNoteNavigation,
  getAppProjectMaterial,
  getAppProjectMaterialCandidateForReview,
  inviteAppUser,
  listAppMySubmissions,
  listAppProjectNoteHistory,
  promoteAppPersonalNote,
  rejectAppProjectMaterialCandidate,
  restoreAppProjectNoteVersionToDraft,
  saveAppNoteDraft,
  updateAppProjectMaterial,
  withdrawAppProjectMaterial,
  ensureAppPersonalProject,
} from "@/modules/application";
import { publishDraft } from "@/modules/knowledge/service";
import { treeNodes } from "@/modules/knowledge/schema";
import { extractionWorker } from "@/modules/storage/extraction";
import { extractionCandidates, sourceVersions } from "@/modules/storage/schema";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const suffix = randomUUID().slice(0, 8);
  const admin = await principalFor("huong@wisdomtree.local");
  const [authorUser, viewerUser, outsiderUser] = await Promise.all([
    inviteAppUser(admin, {
      email: `pc2-author-${suffix}@wisdomtree.local`,
      displayName: "PC2 Author",
    }),
    inviteAppUser(admin, {
      email: `pc2-viewer-${suffix}@wisdomtree.local`,
      displayName: "PC2 Viewer",
    }),
    inviteAppUser(admin, {
      email: `pc2-outsider-${suffix}@wisdomtree.local`,
      displayName: "PC2 Outsider",
    }),
  ]);
  const shared = await createAppProject(admin, {
    name: `PC2 shared ${suffix}`,
    researchLens: "PC2 capability resolution",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await Promise.all([
    addAppProjectMember(manager, {
      projectId: shared.id,
      userId: authorUser.id,
      memberRole: "contributor",
    }),
    addAppProjectMember(manager, {
      projectId: shared.id,
      userId: viewerUser.id,
      memberRole: "viewer",
    }),
  ]);
  const [author, viewer, outsider] = await Promise.all([
    principalFor(`pc2-author-${suffix}@wisdomtree.local`),
    principalFor(`pc2-viewer-${suffix}@wisdomtree.local`),
    principalFor(`pc2-outsider-${suffix}@wisdomtree.local`),
  ]);

  // History is Project Note-native: readers can inspect immutable versions;
  // contributors alone can restore a selected version to an author-private draft.
  const draft = await createAppProjectNote(author, {
    projectId: shared.id,
    title: `PC2 history ${suffix}`,
    contentMd: "first revision",
  });
  const published = await publishDraft(author, draft.id);
  const noteId = published.nodeId;
  const second = await saveAppNoteDraft(author, {
    projectId: shared.id,
    noteId,
    title: `PC2 history ${suffix}`,
    summary: null,
    contentMd: "second revision",
    tags: [],
    researchPurpose: null,
    baseVersion: 1,
    expectedVersion: 0,
  });
  await publishDraft(author, second.id);
  await db
    .update(treeNodes)
    .set({ verification: "verified", publish: true })
    .where(eq(treeNodes.id, noteId));
  assert.equal(
    (await listAppProjectNoteHistory(viewer, { projectId: shared.id, noteId })).length,
    2,
  );
  const historical = await getAppProjectNoteHistoryVersion(author, {
    projectId: shared.id,
    noteId,
    seq: 1,
  });
  assert.equal(historical.contentMd, "first revision");
  assert.ok(historical.diff.some((line) => line.kind === "del"));
  await assert.rejects(
    restoreAppProjectNoteVersionToDraft(viewer, { projectId: shared.id, noteId, seq: 1 }),
    errorCode("forbidden"),
  );
  const restored = await restoreAppProjectNoteVersionToDraft(author, {
    projectId: shared.id,
    noteId,
    seq: 1,
  });
  assert.equal(restored.draft.contentMd, "first revision");
  await assert.rejects(
    listAppProjectNoteHistory(outsider, { projectId: shared.id, noteId }),
    errorCode("not_found"),
  );

  // Promotion copies an owner-visible Personal Note into an authorized Shared
  // working draft and retains the immutable source-version provenance.
  const personal = await ensureAppPersonalProject(author.userId);
  const personalDraft = await createAppProjectNote(author, {
    projectId: personal.id,
    title: `Personal source ${suffix}`,
    contentMd: "Personal research with provenance.",
  });
  const personalPublished = await publishDraft(author, personalDraft.id);
  const promoted = await promoteAppPersonalNote(author, {
    sourceProjectId: personal.id,
    noteId: personalPublished.nodeId,
    targetProjectId: shared.id,
  });
  assert.equal(promoted.projectId, shared.id);
  await assert.rejects(
    promoteAppPersonalNote(viewer, {
      sourceProjectId: personal.id,
      noteId: personalPublished.nodeId,
      targetProjectId: shared.id,
    }),
    errorCode("not_found"),
  );
  const navigation = await getAppProjectNoteNavigation(author, { projectId: shared.id, noteId });
  assert.deepEqual(navigation.links, []);
  assert.deepEqual(navigation.backlinks, []);
  assert.equal(navigation.previous, null);
  assert.equal(navigation.next, null);

  // Material stewardship changes metadata or archival state without mutating
  // immutable bytes/version facts; candidate rejection records a disposition.
  const enqueue = extractionWorker.enqueue;
  extractionWorker.enqueue = () => undefined;
  try {
    const material = await createAppProjectMaterial(author, {
      projectId: shared.id,
      title: `PC2 material ${suffix}`,
      file: new File(["original material"], "pc2.txt", { type: "text/plain" }),
    });
    assert.ok(material.currentVersion);
    const renamed = await updateAppProjectMaterial(author, {
      projectId: shared.id,
      materialId: material.id,
      title: `PC2 material renamed ${suffix}`,
    });
    assert.equal(renamed.title, `PC2 material renamed ${suffix}`);
    await assert.rejects(
      updateAppProjectMaterial(manager, {
        projectId: shared.id,
        materialId: material.id,
        title: "Manager is not steward",
      }),
      errorCode("forbidden"),
    );
    const candidateText = "candidate pending human decision";
    const [candidate] = await db
      .insert(extractionCandidates)
      .values({
        sourceVersionId: material.currentVersion!.id,
        contentMd: candidateText,
        contentSha256: createHash("sha256").update(candidateText).digest("hex"),
        method: "text",
        createdBy: author.userId,
      })
      .returning();
    await db
      .update(sourceVersions)
      .set({ extractionStatus: "processed", extractionMeta: { engine: "pc2" } })
      .where(eq(sourceVersions.id, material.currentVersion!.id));
    assert.equal(
      (
        await getAppProjectMaterialCandidateForReview(author, {
          projectId: shared.id,
          sourceId: material.id,
          sourceVersionId: material.currentVersion!.id,
        })
      ).candidateId,
      candidate.id,
    );
    await rejectAppProjectMaterialCandidate(author, {
      projectId: shared.id,
      materialId: material.id,
      sourceVersionId: material.currentVersion!.id,
    });
    assert.equal(
      (
        await db
          .select({ state: extractionCandidates.state })
          .from(extractionCandidates)
          .where(eq(extractionCandidates.id, candidate.id))
      )[0]?.state,
      "rejected",
    );
    assert.ok(
      (await listAppMySubmissions(author)).some(
        (item) => item.id === material.id && item.projectId === shared.id,
      ),
    );
    await withdrawAppProjectMaterial(author, { projectId: shared.id, materialId: material.id });
    assert.equal(
      (await getAppProjectMaterial(author, shared.id, material.id)).currentVersion?.storageState,
      "archived",
    );
    await assert.rejects(
      getAppProjectMaterial(outsider, shared.id, material.id),
      errorCode("not_found"),
    );

    // Project export is a Project-level portable bundle, not a WikiRelease UI.
    const directory = await mkdtemp(path.join(tmpdir(), "wt-pc2-export-"));
    const previous = process.env.VAULT_GIT_DIR;
    process.env.VAULT_GIT_DIR = directory;
    try {
      const exported = await createAppProjectExport(manager, shared.id);
      assert.equal(exported.status, "released");
      assert.ok(exported.manifestSha256);
    } finally {
      if (previous === undefined) delete process.env.VAULT_GIT_DIR;
      else process.env.VAULT_GIT_DIR = previous;
      await rm(directory, { recursive: true, force: true });
    }
  } finally {
    extractionWorker.enqueue = enqueue;
  }
}

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}
