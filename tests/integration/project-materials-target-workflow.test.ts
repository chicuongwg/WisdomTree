import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import {
  addAppProjectMaterialVersion,
  createAppProjectMaterial,
  evolveAppProjectMaterialCandidateIntoNote,
  getAppProjectMaterial,
  getAppProjectMaterialCandidateForReview,
  requestAppProjectMaterialExtraction,
} from "@/modules/application";
import { inviteUser } from "@/modules/auth/admin";
import { grantTmktCore, revokeTmktCore } from "@/modules/auth/core";
import { createProject } from "@/modules/project/service";
import { evolveCandidate, listPersonalCandidates } from "@/modules/storage/candidates";
import { extractionWorker } from "@/modules/storage/extraction";
import { extractionCandidates, sources, sourceVersions } from "@/modules/storage/schema";
import { addSpaceMember } from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

function assertTargetDto(value: unknown): void {
  const forbidden = new Set(["spaceId", "branchId", "scope", "objectKey", "candidateId"]);
  if (Array.isArray(value)) return void value.forEach(assertTargetDto);
  if (!value || typeof value !== "object" || value instanceof Date) return;
  for (const [key, nested] of Object.entries(value)) {
    assert.equal(forbidden.has(key), false, `target Material DTO leaked ${key}`);
    assertTargetDto(nested);
  }
}

export async function run() {
  const initialAdmin = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("minh@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const project = await createProject(initialAdmin, {
    name: `Material target ${suffix}`,
    researchLens: "Target Material workflow",
  });
  const admin = await principalFor("huong@wisdomtree.local");
  await addSpaceMember(admin, project.id, contributorUser.userId, "contributor");
  const coreEmail = `materials-core-${suffix}@wisdomtree.local`;
  const coreUser = await inviteUser(admin, {
    email: coreEmail,
    displayName: "Materials Core reader",
  });
  const contributor = await principalFor("minh@wisdomtree.local");

  const enqueue = extractionWorker.enqueue;
  extractionWorker.enqueue = () => undefined;
  try {
    const physicalOnly = await createAppProjectMaterial(contributor, {
      projectId: project.id,
      title: "Sổ tay 漢文 𠀀",
      description: "Physical source awaiting a scan",
    });
    assert.equal(physicalOnly.currentVersion, null);
    assertTargetDto(physicalOnly);

    const sourceText = "Nguồn gốc chính xác — 漢文 / 𠀀";
    const material = await createAppProjectMaterial(contributor, {
      projectId: project.id,
      title: "Bản quét tiếng Việt 𠀀",
      description: "Nguồn nghiên cứu đa ngữ",
      file: new File([sourceText], "bản-quét.txt", { type: "text/plain" }),
    });
    assert.ok(material.currentVersion);
    const version = material.currentVersion;

    // Target contributors can requeue extraction without relying on legacy uploader ownership.
    await requestAppProjectMaterialExtraction(contributor, {
      projectId: project.id,
      materialId: material.id,
      sourceVersionId: version.id,
      method: "auto",
    });

    const extracted = "# Văn bản trích xuất\n\nNội dung máy tạo cần được nhà nghiên cứu rà soát.";
    const [candidate] = await db
      .insert(extractionCandidates)
      .values({
        sourceVersionId: version.id,
        contentMd: extracted,
        contentSha256: createHash("sha256").update(extracted).digest("hex"),
        method: "text",
        createdBy: contributor.userId,
      })
      .returning();
    assert.equal(
      (await listPersonalCandidates(contributor)).some((item) => item.id === candidate.id),
      false,
    );
    await assert.rejects(
      evolveCandidate(contributor, candidate.id, { branchId: randomUUID() }),
      errorCode("not_found"),
    );
    await db
      .update(sourceVersions)
      .set({ extractionStatus: "processed", extractionMeta: { engine: "test" } })
      .where(eq(sourceVersions.id, version.id));

    const review = await getAppProjectMaterialCandidateForReview(contributor, {
      projectId: project.id,
      sourceId: material.id,
      sourceVersionId: version.id,
    });
    assert.equal(review.contentMd, extracted);
    assert.equal(review.sourceVersionId, version.id);

    await grantTmktCore(admin, coreUser.id);
    const core = await principalFor(coreEmail);
    const coreRead = await getAppProjectMaterial(core, project.id, material.id);
    assert.equal(coreRead.id, material.id);
    await assert.rejects(
      getAppProjectMaterialCandidateForReview(core, {
        projectId: project.id,
        sourceId: material.id,
        sourceVersionId: version.id,
      }),
      errorCode("forbidden"),
    );

    const result = await evolveAppProjectMaterialCandidateIntoNote(contributor, {
      projectId: project.id,
      materialId: material.id,
      sourceVersionId: version.id,
      title: "Ghi chú làm việc từ bản quét",
    });
    assert.equal(result.draft.projectId, project.id);
    assert.equal(result.sourceVersionId, version.id);
    assert.equal(result.materialId, material.id);
    assert.equal(result.draft.contentMd, extracted);

    const [evolved] = await db
      .select({ evolvedDraftId: extractionCandidates.evolvedDraftId })
      .from(extractionCandidates)
      .where(eq(extractionCandidates.id, candidate.id));
    assert.equal(evolved.evolvedDraftId, result.draft.id);

    // Target Project contributors can append an exact new SourceVersion even
    // when a different contributor uploaded the original representation.
    const withAppendedVersion = await addAppProjectMaterialVersion(admin, {
      projectId: project.id,
      materialId: material.id,
      file: new File(["revised source"], "bản-quét-v2.txt", { type: "text/plain" }),
    });
    assert.equal(withAppendedVersion.currentVersion?.seq, 2);
    assert.equal(withAppendedVersion.versions.length, 2);

    await assert.rejects(
      db
        .update(sources)
        .set({ currentVersionId: version.id })
        .where(eq(sources.id, physicalOnly.id)),
    );

    // Original representation fields are database-protected; derived extraction state is the only update above.
    await assert.rejects(
      db
        .update(sourceVersions)
        .set({ originalFilename: "rewritten.txt" })
        .where(and(eq(sourceVersions.id, version.id), eq(sourceVersions.sourceId, material.id))),
    );
    await revokeTmktCore(admin, coreUser.id);
  } finally {
    extractionWorker.enqueue = enqueue;
  }
}
