import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  addAppProjectMember,
  createAppCollaborationComment,
  createAppProject,
  createAppProjectMaterial,
  createAppProjectNote,
  ensureAppPersonalProject,
  getAppCollaborationContext,
  getAppProjectNote,
  grantAppCoreMember,
  inviteAppUser,
  listAppCollaborationComments,
  listAppNotifications,
  listAppCollaborationPresence,
  markAppCollaborationPresence,
  markAppNotificationRead,
  publishAppDraft,
  setAppUserDisabled,
} from "@/modules/application";
import { updatePreferences } from "@/modules/notify/service";
import { ApiError } from "@/lib/errors";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) =>
  error instanceof ApiError && error.code === code;

export async function run() {
  const admin = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const authorEmail = `stage17-pr3-author-${suffix}@wisdomtree.local`;
  const recipientEmail = `stage17-pr3-recipient-${suffix}@wisdomtree.local`;
  const outsiderEmail = `stage17-pr3-outsider-${suffix}@wisdomtree.local`;
  const coreEmail = `stage17-pr3-core-${suffix}@wisdomtree.local`;
  const recipientName = `PR3 Người nhận ${suffix}`;
  const [authorUser, recipientUser, outsiderUser, coreUser] = await Promise.all([
    inviteAppUser(admin, { email: authorEmail, displayName: `PR3 Người gửi ${suffix}` }),
    inviteAppUser(admin, { email: recipientEmail, displayName: recipientName }),
    inviteAppUser(admin, { email: outsiderEmail, displayName: `PR3 Người ngoài ${suffix}` }),
    inviteAppUser(admin, { email: coreEmail, displayName: `PR3 Core ${suffix}` }),
  ]);
  const project = await createAppProject(admin, {
    name: `PR3 Collaboration ${suffix}`,
    researchLens: "Restored Project collaboration",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  await addAppProjectMember(manager, {
    projectId: project.id,
    userId: authorUser.id,
    memberRole: "contributor",
  });
  await addAppProjectMember(manager, {
    projectId: project.id,
    userId: recipientUser.id,
    memberRole: "contributor",
  });
  const [author, recipient, outsider] = await Promise.all([
    principalFor(authorEmail),
    principalFor(recipientEmail),
    principalFor(outsiderEmail),
  ]);

  const draft = await createAppProjectNote(author, {
    projectId: project.id,
    title: `PR3 Note ${suffix}`,
    contentMd: "# Evidence\n\nThe collaboration anchor remains metadata, not evidence.",
  });
  const official = await publishAppDraft(author, draft.id);
  const noteComment = await createAppCollaborationComment(author, {
    kind: "note",
    projectId: project.id,
    entityId: official.nodeId,
    body: `@${recipientName} kiểm tra Tiếng Việt 中文 日本語 한국어 العربية 𠀀`,
  });
  const noteComments = await listAppCollaborationComments(author, {
    kind: "note",
    projectId: project.id,
    entityId: official.nodeId,
  });
  assert.equal(noteComments.length, 1);
  assert.equal(noteComments[0]?.authorId, author.userId);
  assert.equal(noteComments[0]?.body.includes("𠀀"), true);
  assert.deepEqual(noteComments[0]?.mentions, [recipient.userId]);
  const reply = await createAppCollaborationComment(recipient, {
    kind: "note",
    projectId: project.id,
    entityId: official.nodeId,
    parentCommentId: noteComment.id,
    body: "Mình đã cập nhật evidence.",
  });
  assert.equal(reply.parentCommentId, noteComment.id);

  const notifications = await listAppNotifications(recipient);
  const mention = notifications.find(
    (notification) =>
      notification.eventType === "comment.created" &&
      notification.link?.href.endsWith(`#comment-${noteComment.id}`),
  );
  assert.ok(mention, "mentioned User receives an exact target notification link");
  assert.equal(
    mention.link?.href,
    `/app/projects/${project.id}/notes/${official.nodeId}#comment-${noteComment.id}`,
  );
  assert.equal(mention.link?.subject, `PR3 Note ${suffix}`);
  assert.equal(mention.readAt, null);
  await markAppNotificationRead(recipient, mention.id);
  assert.notEqual(
    (await listAppNotifications(recipient)).find((notification) => notification.id === mention.id)
      ?.readAt,
    null,
  );
  await assert.rejects(markAppNotificationRead(author, mention.id), errorCode("not_found"));

  const material = await createAppProjectMaterial(author, {
    projectId: project.id,
    title: `PR3 Material ${suffix}`,
  });
  const materialComment = await createAppCollaborationComment(author, {
    kind: "material",
    projectId: project.id,
    entityId: material.id,
    body: "Scan quality needs review.",
  });
  const materialComments = await listAppCollaborationComments(recipient, {
    kind: "material",
    projectId: project.id,
    entityId: material.id,
  });
  assert.equal(materialComments[0]?.id, materialComment.id);

  const authorPresence = await markAppCollaborationPresence(author, {
    kind: "note",
    projectId: project.id,
    entityId: official.nodeId,
  });
  assert.deepEqual(authorPresence, []);
  const recipientPresence = await markAppCollaborationPresence(recipient, {
    kind: "note",
    projectId: project.id,
    entityId: official.nodeId,
  });
  assert.equal(recipientPresence[0]?.userId, author.userId);
  assert.equal(
    (
      await listAppCollaborationPresence(author, {
        kind: "note",
        projectId: project.id,
        entityId: official.nodeId,
      })
    )[0]?.userId,
    recipient.userId,
  );

  // A normal comment is valid but does not notify an entire Project.
  const beforePlainComment = (await listAppNotifications(recipient)).length;
  await createAppCollaborationComment(author, {
    kind: "material",
    projectId: project.id,
    entityId: material.id,
    body: "No mention here.",
  });
  assert.equal((await listAppNotifications(recipient)).length, beforePlainComment);

  // Existing comment-created preference is honored by the retained fan-out.
  await updatePreferences(recipient, [{ eventType: "comment.created", enabled: false }]);
  const beforeMutedMention = (await listAppNotifications(recipient)).length;
  await createAppCollaborationComment(author, {
    kind: "material",
    projectId: project.id,
    entityId: material.id,
    body: `@${recipientName} this is intentionally muted.`,
  });
  assert.equal((await listAppNotifications(recipient)).length, beforeMutedMention);

  await assert.rejects(
    listAppCollaborationComments(outsider, {
      kind: "note",
      projectId: project.id,
      entityId: official.nodeId,
    }),
    errorCode("not_found"),
  );
  await assert.rejects(
    markAppCollaborationPresence(outsider, {
      kind: "material",
      projectId: project.id,
      entityId: material.id,
    }),
    errorCode("not_found"),
  );

  await grantAppCoreMember(admin, coreUser.id);
  const core = await principalFor(coreEmail);
  assert.equal((await getAppProjectNote(core, project.id, official.nodeId)).id, official.nodeId);
  await assert.rejects(
    getAppCollaborationContext(core, {
      kind: "note",
      projectId: project.id,
      entityId: official.nodeId,
    }),
    errorCode("not_found"),
  );

  // A Personal Project's candidate pool stays owner-only.
  const personal = await ensureAppPersonalProject(author.userId);
  const personalAuthor = await principalFor(authorEmail);
  const personalMaterial = await createAppProjectMaterial(personalAuthor, {
    projectId: personal.id,
    title: `PR3 Personal Material ${suffix}`,
  });
  const personalContext = await getAppCollaborationContext(personalAuthor, {
    kind: "material",
    projectId: personal.id,
    entityId: personalMaterial.id,
  });
  assert.deepEqual(
    personalContext.mentionCandidates.map((candidate) => candidate.id),
    [author.userId],
  );
  await assert.rejects(
    getAppCollaborationContext(outsider, {
      kind: "material",
      projectId: personal.id,
      entityId: personalMaterial.id,
    }),
    errorCode("not_found"),
  );

  // Disabled accounts disappear from future mention choices and active
  // presence reads, while their old data remains append-only.
  await setAppUserDisabled(admin, recipient.userId, true);
  const candidatesAfterDisable = await getAppCollaborationContext(author, {
    kind: "note",
    projectId: project.id,
    entityId: official.nodeId,
  });
  assert.equal(
    candidatesAfterDisable.mentionCandidates.some((candidate) => candidate.id === recipient.userId),
    false,
  );
  assert.equal(
    (
      await listAppCollaborationPresence(author, {
        kind: "note",
        projectId: project.id,
        entityId: official.nodeId,
      })
    ).some((person) => person.userId === recipient.userId),
    false,
  );

  assert.ok(outsiderUser.id);
}
