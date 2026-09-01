import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import { getDraft, publishDraft } from "@/modules/knowledge/service";
import { branches, nodeDrafts, treeNodes } from "@/modules/knowledge/schema";
import { createProject } from "@/modules/project/service";
import {
  evolveCandidate,
  evolveCandidateIntoProjectNote,
} from "@/modules/storage/candidates";
import { extractionWorker } from "@/modules/storage/extraction";
import { extractionCandidates, sources, sourceVersions, spaces } from "@/modules/storage/schema";
import {
  addSpaceMember,
  createProjectMaterial,
  uploadSource,
} from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

async function createCandidate(sourceVersionId: string, createdBy: string, contentMd: string) {
  const [candidate] = await db
    .insert(extractionCandidates)
    .values({
      sourceVersionId,
      contentMd,
      contentSha256: createHash("sha256").update(contentMd).digest("hex"),
      method: "text",
      createdBy,
    })
    .returning();
  return candidate;
}

export async function run() {
  const initialAdmin = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("minh@wisdomtree.local");
  const viewerUser = await principalFor("lan@wisdomtree.local");
  const outsider = await principalFor("duc@wisdomtree.local");
  const [legacyTeam] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(eq(spaces.name, "Kho Dự Án Cộng Đồng"));
  const [personal] = await db
    .select({ id: spaces.id })
    .from(spaces)
    .where(and(eq(spaces.type, "personal"), eq(spaces.ownerUserId, contributorUser.userId)));
  assert.ok(legacyTeam);
  assert.ok(personal);

  const demoCandidates = await db.select({ id: extractionCandidates.id }).from(extractionCandidates);
  assert.ok(
    (
      await db
        .select({ id: extractionCandidates.id })
        .from(extractionCandidates)
        .where(sql`${extractionCandidates.evolvedDraftId} IS NOT NULL`)
    ).length === 0,
  );

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const projectA = await createProject(initialAdmin, {
    name: `Extraction Project A ${suffix}`,
    researchLens: "Candidate-derived Project Note",
  });
  const projectB = await createProject(initialAdmin, {
    name: `Extraction Project B ${suffix}`,
    researchLens: "Caller override resistance",
  });
  const projectC = await createProject(initialAdmin, {
    name: `Extraction Atomicity ${suffix}`,
    researchLens: "Transactional candidate handoff",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  for (const project of [projectA, projectC]) {
    await addSpaceMember(manager, project.id, contributorUser.userId, "contributor");
  }
  await addSpaceMember(manager, projectA.id, viewerUser.userId, "viewer");
  const contributor = await principalFor("minh@wisdomtree.local");
  const viewer = await principalFor("lan@wisdomtree.local");

  const enqueue = extractionWorker.enqueue;
  extractionWorker.enqueue = () => undefined;
  try {
    const material = await createProjectMaterial(contributor, {
      projectId: projectA.id,
      title: "Interview scan",
      file: new File(["source"], "interview.txt", { type: "text/plain" }),
    });
    assert.ok(material.currentVersion);
    const candidate = await createCandidate(
      material.currentVersion.id,
      contributor.userId,
      "# Extracted interview\n\nMachine-extracted working text.",
    );
    const [sourceBefore] = await db.select().from(sources).where(eq(sources.id, material.id));
    const [versionBefore] = await db
      .select()
      .from(sourceVersions)
      .where(eq(sourceVersions.id, material.currentVersion.id));

    // Extra caller-owned context is ignored: Project and Branch come only
    // from Candidate -> SourceVersion -> Source -> confirmed Project.
    const draft = await evolveCandidateIntoProjectNote(contributor, {
      candidateId: candidate.id,
      title: " Extracted interview working note ",
      projectId: projectB.id,
      branchId: randomUUID(),
    } as Parameters<typeof evolveCandidateIntoProjectNote>[1] & {
      projectId: string;
      branchId: string;
    });
    assert.equal(draft.projectId, projectA.id);
    assert.equal(draft.authorId, contributor.userId);
    assert.equal(draft.workingVisibility, "author_private");
    assert.equal(draft.title, "Extracted interview working note");
    assert.equal(draft.contentMd, candidate.contentMd);
    const [draftBranch] = await db.select().from(branches).where(eq(branches.id, draft.branchId));
    assert.equal(draftBranch.scope, "team");
    assert.equal(draftBranch.spaceId, projectA.id);
    assert.equal((await getDraft(contributor, draft.id)).id, draft.id);
    await assert.rejects(getDraft(manager, draft.id), errorCode("not_found"));

    const [evolved] = await db
      .select()
      .from(extractionCandidates)
      .where(eq(extractionCandidates.id, candidate.id));
    assert.equal(evolved.state, "evolved");
    assert.equal(evolved.evolvedDraftId, draft.id);
    assert.equal(evolved.evolvedNodeId, null);
    assert.deepEqual(
      await db.select().from(sources).where(eq(sources.id, material.id)).then((rows) => rows[0]),
      sourceBefore,
    );
    assert.deepEqual(
      await db
        .select()
        .from(sourceVersions)
        .where(eq(sourceVersions.id, material.currentVersion!.id))
        .then((rows) => rows[0]),
      versionBefore,
    );
    const [audit] = await db
      .select({ details: auditEvents.details })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, "candidate.evolve_project"),
          eq(auditEvents.targetId, draft.id),
        ),
      );
    assert.deepEqual(audit.details, {
      candidateId: candidate.id,
      sourceVersionId: material.currentVersion.id,
      sourceId: material.id,
      projectId: projectA.id,
      draftId: draft.id,
    });

    const draftCount = await db
      .select({ id: nodeDrafts.id })
      .from(nodeDrafts)
      .where(eq(nodeDrafts.projectId, projectA.id))
      .then((rows) => rows.length);
    await assert.rejects(
      evolveCandidateIntoProjectNote(contributor, { candidateId: candidate.id }),
      errorCode("invalid_state"),
    );
    assert.equal(
      await db
        .select({ id: nodeDrafts.id })
        .from(nodeDrafts)
        .where(eq(nodeDrafts.projectId, projectA.id))
        .then((rows) => rows.length),
      draftCount,
    );

    const published = await publishDraft(contributor, draft.id);
    const [publishedCandidate] = await db
      .select()
      .from(extractionCandidates)
      .where(eq(extractionCandidates.id, candidate.id));
    const [publishedNode] = await db
      .select()
      .from(treeNodes)
      .where(eq(treeNodes.id, published.nodeId));
    assert.equal(publishedCandidate.evolvedDraftId, null);
    assert.equal(publishedCandidate.evolvedNodeId, published.nodeId);
    assert.equal(publishedNode.projectId, projectA.id);

    const restrictedMaterial = await createProjectMaterial(contributor, {
      projectId: projectA.id,
      title: "Authorization candidate",
      file: new File(["authorization"], "authorization.txt", { type: "text/plain" }),
    });
    const restricted = await createCandidate(
      restrictedMaterial.currentVersion!.id,
      contributor.userId,
      "Authorization test.",
    );
    await assert.rejects(
      evolveCandidateIntoProjectNote(viewer, { candidateId: restricted.id }),
      errorCode("forbidden"),
    );
    await assert.rejects(
      evolveCandidateIntoProjectNote(outsider, { candidateId: restricted.id }),
      errorCode("not_found"),
    );
    assert.equal(
      await db
        .select({ state: extractionCandidates.state })
        .from(extractionCandidates)
        .where(eq(extractionCandidates.id, restricted.id))
        .then((rows) => rows[0]?.state),
      "pending_review",
    );

    const unsafeMaterial = await createProjectMaterial(contributor, {
      projectId: projectA.id,
      title: "Unsafe extracted content",
      file: new File(["unsafe"], "unsafe.txt", { type: "text/plain" }),
    });
    const unsafe = await createCandidate(
      unsafeMaterial.currentVersion!.id,
      contributor.userId,
      "```\nunclosed extraction",
    );
    const draftsBeforeUnsafe = await db.select({ id: nodeDrafts.id }).from(nodeDrafts);
    await assert.rejects(
      evolveCandidateIntoProjectNote(contributor, { candidateId: unsafe.id }),
      errorCode("invalid_markdown"),
    );
    assert.equal(
      await db.select({ id: nodeDrafts.id }).from(nodeDrafts).then((rows) => rows.length),
      draftsBeforeUnsafe.length,
    );
    assert.equal(
      await db
        .select({ state: extractionCandidates.state })
        .from(extractionCandidates)
        .where(eq(extractionCandidates.id, unsafe.id))
        .then((rows) => rows[0]?.state),
      "pending_review",
    );

    const atomicMaterial = await createProjectMaterial(contributor, {
      projectId: projectC.id,
      title: "Candidate update failure",
      file: new File(["atomic"], "atomic.txt", { type: "text/plain" }),
    });
    const atomic = await createCandidate(
      atomicMaterial.currentVersion!.id,
      contributor.userId,
      "Atomic working content.",
    );
    await db.execute(sql`
      CREATE FUNCTION stage8_force_candidate_failure() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced candidate update failure'; END; $$
    `);
    await db.execute(sql`
      CREATE TRIGGER stage8_force_candidate_failure
      BEFORE UPDATE ON extraction_candidates
      FOR EACH ROW EXECUTE FUNCTION stage8_force_candidate_failure()
    `);
    try {
      await assert.rejects(
        evolveCandidateIntoProjectNote(contributor, { candidateId: atomic.id }),
        (error: unknown) =>
          error instanceof Error &&
          "cause" in error &&
          error.cause instanceof Error &&
          error.cause.message === "forced candidate update failure",
      );
    } finally {
      await db.execute(sql`DROP TRIGGER stage8_force_candidate_failure ON extraction_candidates`);
      await db.execute(sql`DROP FUNCTION stage8_force_candidate_failure()`);
    }
    assert.equal(
      await db
        .select({ state: extractionCandidates.state })
        .from(extractionCandidates)
        .where(eq(extractionCandidates.id, atomic.id))
        .then((rows) => rows[0]?.state),
      "pending_review",
    );
    assert.equal(
      await db
        .select({ id: nodeDrafts.id })
        .from(nodeDrafts)
        .where(eq(nodeDrafts.projectId, projectC.id))
        .then((rows) => rows.length),
      0,
    );
    assert.equal(
      await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.spaceId, projectC.id))
        .then((rows) => rows.length),
      0,
    );

    const personalMaterial = await uploadSource(contributor, {
      spaceId: personal.id,
      title: "Personal candidate",
      file: new File(["personal"], "personal.txt", { type: "text/plain" }),
    });
    const personalCandidate = await createCandidate(
      personalMaterial.currentVersion!.id,
      contributor.userId,
      "Personal compatibility content.",
    );
    const legacyMaterial = await uploadSource(initialAdmin, {
      spaceId: legacyTeam.id,
      title: "Legacy candidate",
      file: new File(["legacy"], "legacy.txt", { type: "text/plain" }),
    });
    const legacyCandidate = await createCandidate(
      legacyMaterial.currentVersion!.id,
      initialAdmin.userId,
      "Legacy compatibility content.",
    );
    for (const invalid of [personalCandidate.id, legacyCandidate.id, randomUUID()]) {
      await assert.rejects(
        evolveCandidateIntoProjectNote(contributor, { candidateId: invalid }),
        errorCode("not_found"),
      );
    }
    await assert.rejects(
      evolveCandidateIntoProjectNote(contributor, {}),
      errorCode("invalid_candidate"),
    );

    const [personalBranch] = await db
      .select()
      .from(branches)
      .where(
        and(eq(branches.scope, "personal"), eq(branches.ownerUserId, contributor.userId)),
      );
    const legacyNode = await evolveCandidate(contributor, personalCandidate.id, {
      branchId: personalBranch.id,
      title: "Legacy personal evolution",
    });
    assert.equal(legacyNode.projectId, null);
    assert.equal(
      await db
        .select({ evolvedNodeId: extractionCandidates.evolvedNodeId })
        .from(extractionCandidates)
        .where(eq(extractionCandidates.id, personalCandidate.id))
        .then((rows) => rows[0]?.evolvedNodeId),
      legacyNode.id,
    );

    await assert.rejects(
      db
        .update(extractionCandidates)
        .set({ evolvedDraftId: randomUUID() })
        .where(eq(extractionCandidates.id, atomic.id)),
    );

    const remainingDemoCandidates = demoCandidates.length
      ? await db
          .select({ id: extractionCandidates.id })
          .from(extractionCandidates)
          .where(inArray(extractionCandidates.id, demoCandidates.map((row) => row.id)))
      : [];
    assert.equal(remainingDemoCandidates.length, demoCandidates.length);
  } finally {
    extractionWorker.enqueue = enqueue;
  }
}
