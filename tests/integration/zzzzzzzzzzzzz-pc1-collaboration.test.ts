import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  addAppProjectMember, createAppCollaborationComment, createAppDeadline, createAppProject,
  createAppProjectActivity, createAppProjectTask, getAppCollaborationContext, inviteAppUser,
  listAppCollaborationComments, listAppCollaborationPresence, listAppNotifications,
  markAppCollaborationPresence, removeAppProjectMember,
} from "@/modules/application";
import { grantTmktCore } from "@/modules/auth/core";
import { ApiError } from "@/lib/errors";
import { principalFor } from "../setup";

const errorCode = (code: string) => (error: unknown) => error instanceof ApiError && error.code === code;

export async function run() {
  const suffix = randomUUID().slice(0, 8);
  const admin = await principalFor("huong@wisdomtree.local");
  const [authorUser, recipientUser, outsiderUser, coreUser] = await Promise.all([
    inviteAppUser(admin, { email: `pc1-author-${suffix}@wisdomtree.local`, displayName: `PC1 Tác giả ${suffix}` }),
    inviteAppUser(admin, { email: `pc1-recipient-${suffix}@wisdomtree.local`, displayName: `PC1 Người nhận ${suffix}` }),
    inviteAppUser(admin, { email: `pc1-outsider-${suffix}@wisdomtree.local`, displayName: `PC1 Ngoài ${suffix}` }),
    inviteAppUser(admin, { email: `pc1-core-${suffix}@wisdomtree.local`, displayName: `PC1 Core ${suffix}` }),
  ]);
  const project = await createAppProject(admin, { name: `PC1 ${suffix}`, researchLens: "collaboration" });
  const manager = await principalFor("huong@wisdomtree.local");
  await Promise.all([
    addAppProjectMember(manager, { projectId: project.id, userId: authorUser.id, memberRole: "contributor" }),
    addAppProjectMember(manager, { projectId: project.id, userId: recipientUser.id, memberRole: "contributor" }),
    grantTmktCore(manager, coreUser.id),
  ]);
  const [author, recipient, outsider, core] = await Promise.all([
    principalFor(`pc1-author-${suffix}@wisdomtree.local`), principalFor(`pc1-recipient-${suffix}@wisdomtree.local`),
    principalFor(`pc1-outsider-${suffix}@wisdomtree.local`), principalFor(`pc1-core-${suffix}@wisdomtree.local`),
  ]);
  const activity = await createAppProjectActivity(author, { projectId: project.id, title: `Hoạt động ${suffix}` });
  const task = await createAppProjectTask(author, { projectId: project.id, title: `Task ${suffix}` });
  const deadline = await createAppDeadline(author, { spaceId: project.id, title: `Deadline ${suffix}`, type: "milestone", dueAt: new Date(Date.now() + 86_400_000).toISOString() });
  for (const [kind, entityId] of [["activity", activity.id], ["task", task.id], ["deadline", deadline.id]] as const) {
    const first = await createAppCollaborationComment(author, { kind, projectId: project.id, entityId, body: `@PC1 Người nhận ${suffix} tiếng Việt 中文` });
    const reply = await createAppCollaborationComment(recipient, { kind, projectId: project.id, entityId, parentCommentId: first.id, body: "Đã xem 中文" });
    assert.equal(reply.parentCommentId, first.id);
    assert.equal((await listAppCollaborationComments(recipient, { kind, projectId: project.id, entityId })).length, 2);
    await markAppCollaborationPresence(author, { kind, projectId: project.id, entityId });
    assert.equal((await markAppCollaborationPresence(recipient, { kind, projectId: project.id, entityId }))[0]?.userId, author.userId);
    const notification = (await listAppNotifications(recipient)).find((item) => item.link?.href.endsWith(`#comment-${first.id}`));
    assert.ok(notification?.link?.href.includes(kind === "activity" ? `/activities/${activity.id}` : kind === "task" ? `/tasks/${task.id}` : "/calendar/deadlines/"));
  }
  await assert.rejects(getAppCollaborationContext(outsider, { kind: "activity", projectId: project.id, entityId: activity.id }), errorCode("not_found"));
  await assert.rejects(getAppCollaborationContext(core, { kind: "task", projectId: project.id, entityId: task.id }), errorCode("not_found"));
  await assert.rejects(listAppCollaborationPresence(outsider, { kind: "deadline", entityId: deadline.id }), errorCode("not_found"));
  await removeAppProjectMember(manager, { projectId: project.id, userId: recipientUser.id });
  assert.equal((await listAppNotifications(recipient)).some((item) => item.link?.href.includes(`/activities/${activity.id}`)), false);
  assert.ok(outsiderUser.id);
}
