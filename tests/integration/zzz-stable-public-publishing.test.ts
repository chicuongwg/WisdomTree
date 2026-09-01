import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/errors";
import { auditEvents } from "@/modules/audit/schema";
import { inviteUser } from "@/modules/auth/admin";
import { grantTmktCore, revokeTmktCore } from "@/modules/auth/core";
import { tmktCoreMembers } from "@/modules/auth/schema";
import { createProjectNote, publishDraft, saveNodeDraft } from "@/modules/knowledge/service";
import { treeNodes, treeNodeVersions } from "@/modules/knowledge/schema";
import { getPublishedNoteBySlug, publishNote, unpublishNote } from "@/modules/publication/service";
import { notePublications, notePublicRevisions } from "@/modules/publication/schema";
import { createProject } from "@/modules/project/service";
import { spaceMembers } from "@/modules/storage/schema";
import { addSpaceMember } from "@/modules/storage/service";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

const snapshot = (title: string, contentMd: string) => ({
  title,
  summary: "Public-safe summary",
  sortOrder: 0,
  contentMd,
  tags: [],
  links: [],
});

export async function run() {
  assert.equal((await db.select().from(tmktCoreMembers)).length, 0);
  const admin = await principalFor("huong@wisdomtree.local");
  const editor = await principalFor("minh@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const project = await createProject(admin, {
    name: `Public publishing Project ${suffix}`,
    researchLens: "Stable public revisions",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  const contributorUser = await principalFor("duc@wisdomtree.local");
  await addSpaceMember(manager, project.id, contributorUser.userId, "contributor");
  const contributor = await principalFor("duc@wisdomtree.local");
  const coreEmail = `stage13-core-${suffix}@wisdomtree.local`;
  const coreUser = await inviteUser(admin, {
    email: coreEmail,
    displayName: "Stage 13 Core fixture",
    role: "user",
  });
  const core = await principalFor(coreEmail);

  const privateDraft = await createProjectNote(manager, {
    projectId: project.id,
    title: "Private draft",
    contentMd: "# Private draft",
  });
  const draft = await createProjectNote(manager, {
    projectId: project.id,
    title: `Stable public knowledge ${suffix}`,
    summary: "Public-safe summary",
    contentMd: "# Public version one\n\nFirst immutable snapshot.",
  });
  const official = await publishDraft(manager, draft.id);

  for (const actor of [manager, contributor, editor]) {
    await assert.rejects(publishNote(actor, { noteId: official.nodeId }), errorCode("forbidden"));
  }
  await assert.rejects(publishNote(core, { noteId: official.nodeId }), errorCode("forbidden"));
  await grantTmktCore(admin, coreUser.id);
  assert.equal(
    (await db.select().from(spaceMembers).where(eq(spaceMembers.userId, core.userId))).some(
      (membership) => membership.spaceId === project.id,
    ),
    false,
  );
  await assert.rejects(publishNote(core, { noteId: privateDraft.id }), errorCode("not_found"));
  const [legacyNode] = await db
    .select({ id: treeNodes.id })
    .from(treeNodes)
    .where(isNull(treeNodes.projectId));
  if (legacyNode) {
    await assert.rejects(publishNote(core, { noteId: legacyNode.id }), errorCode("not_found"));
  }

  const first = await publishNote(core, {
    noteId: official.nodeId,
    publicSlug: "Stable Public Knowledge",
  });
  assert.equal(first.changed, true);
  assert.equal(first.publication.noteId, official.nodeId);
  assert.equal(first.publication.publicSlug, "stable-public-knowledge");
  assert.equal(first.revision.revisionNumber, 1);
  const [internalV1] = await db
    .select()
    .from(treeNodeVersions)
    .where(eq(treeNodeVersions.nodeId, official.nodeId));
  assert.equal(first.revision.sourceNoteVersionId, internalV1.id);

  const publicV1 = await getPublishedNoteBySlug(first.publication.publicSlug);
  assert.deepEqual(Object.keys(publicV1).sort(), [
    "contentMd",
    "noteId",
    "project",
    "publishedAt",
    "revisionNumber",
    "slug",
    "summary",
    "title",
  ]);
  assert.equal(publicV1.contentMd, "# Public version one\n\nFirst immutable snapshot.");
  assert.equal(publicV1.project.id, project.id);

  const unchanged = await publishNote(core, { noteId: official.nodeId });
  assert.equal(unchanged.changed, false);
  assert.equal((await db.select().from(notePublicRevisions)).length, 1);

  const editV2 = await saveNodeDraft(manager, official.nodeId, "vi", {
    ...snapshot(draft.title, "# Public version two\n\nInternal edit not public yet."),
    baseVersion: 1,
    expectedDraftVersion: 0,
  });
  await publishDraft(manager, editV2.id);
  assert.equal(
    (await getPublishedNoteBySlug(first.publication.publicSlug)).contentMd,
    "# Public version one\n\nFirst immutable snapshot.",
  );
  const second = await publishNote(core, { noteId: official.nodeId });
  assert.equal(second.revision.revisionNumber, 2);
  assert.equal(
    (await getPublishedNoteBySlug(first.publication.publicSlug)).contentMd,
    "# Public version two\n\nInternal edit not public yet.",
  );
  const revisionsAfterV2 = await db
    .select()
    .from(notePublicRevisions)
    .where(eq(notePublicRevisions.noteId, official.nodeId));
  assert.equal(revisionsAfterV2.length, 2);
  assert.equal(revisionsAfterV2[0].contentMd, "# Public version one\n\nFirst immutable snapshot.");
  await assert.rejects(
    db
      .update(notePublicRevisions)
      .set({ contentMd: "mutated" })
      .where(eq(notePublicRevisions.id, first.revision.id)),
  );
  await assert.rejects(
    db.delete(notePublicRevisions).where(eq(notePublicRevisions.id, first.revision.id)),
  );

  await unpublishNote(core, official.nodeId);
  await assert.rejects(
    getPublishedNoteBySlug(first.publication.publicSlug),
    errorCode("not_found"),
  );
  assert.equal((await db.select().from(notePublications)).length, 1);
  assert.equal((await db.select().from(notePublicRevisions)).length, 2);
  const reactivated = await publishNote(core, { noteId: official.nodeId });
  assert.equal(reactivated.revision.id, second.revision.id);
  assert.equal((await db.select().from(notePublicRevisions)).length, 2);

  await unpublishNote(core, official.nodeId);
  const editV3 = await saveNodeDraft(manager, official.nodeId, "vi", {
    ...snapshot(draft.title, "# Public version three\n\nChanged while unpublished."),
    baseVersion: 2,
    expectedDraftVersion: 0,
  });
  await publishDraft(manager, editV3.id);
  const [concurrentA, concurrentB] = await Promise.all([
    publishNote(core, { noteId: official.nodeId }),
    publishNote(core, { noteId: official.nodeId }),
  ]);
  assert.equal([concurrentA.changed, concurrentB.changed].filter(Boolean).length, 1);
  assert.equal((await db.select().from(notePublicRevisions)).length, 3);
  assert.equal((await getPublishedNoteBySlug(first.publication.publicSlug)).revisionNumber, 3);

  const collisionProject = await createProject(admin, {
    name: `Public slug collision Project ${suffix}`,
    researchLens: "Global public URL collision",
  });
  const collisionManager = await principalFor("huong@wisdomtree.local");
  const sameTitleDraft = await createProjectNote(collisionManager, {
    projectId: collisionProject.id,
    title: draft.title,
    contentMd: "# Another Note",
  });
  const sameTitleOfficial = await publishDraft(collisionManager, sameTitleDraft.id);
  const collisionSafe = await publishNote(core, { noteId: sameTitleOfficial.nodeId });
  assert.notEqual(collisionSafe.publication.publicSlug, first.publication.publicSlug);
  const explicitCollisionDraft = await createProjectNote(collisionManager, {
    projectId: collisionProject.id,
    title: `Explicit collision ${suffix}`,
    contentMd: "# Explicit collision",
  });
  const explicitCollision = await publishDraft(collisionManager, explicitCollisionDraft.id);
  await assert.rejects(
    publishNote(core, {
      noteId: explicitCollision.nodeId,
      publicSlug: first.publication.publicSlug,
    }),
    errorCode("public_slug_taken"),
  );
  await assert.rejects(
    publishNote(core, { noteId: official.nodeId, publicSlug: "changed-slug" }),
    errorCode("public_slug_immutable"),
  );

  const audit = await db
    .select({ action: auditEvents.action, details: auditEvents.details })
    .from(auditEvents)
    .where(and(eq(auditEvents.targetType, "tree_node"), eq(auditEvents.targetId, official.nodeId)));
  assert.equal(audit.filter((row) => row.action === "note.public.publish").length, 4);
  assert.equal(audit.filter((row) => row.action === "note.public.unpublish").length, 2);
  assert.ok(
    audit
      .filter((row) => row.action === "note.public.publish")
      .every((row) => !("contentMd" in ((row.details ?? {}) as Record<string, unknown>))),
  );

  await revokeTmktCore(admin, core.userId);
  await assert.rejects(unpublishNote(core, official.nodeId), errorCode("forbidden"));
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
