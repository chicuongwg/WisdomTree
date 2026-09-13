import { notFound } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { getDeadline } from "../pm/service";
import {
  authorizeCommentContext,
  createComment,
  listComments,
  listMentionCandidates,
  listNotificationsWithLinks,
  listPresence,
  markNotificationRead,
  markPresence,
  clearPresence,
  NOTIFICATION_LIMIT,
  unreadCount,
} from "../notify/service";
import { getProject, getProjectApplicationAccess } from "../project/service";
import { getAppProjectMaterial } from "./materials";
import { getAppProjectNote } from "./notes";
import { getAppActivityWorkspace } from "./activities";
import { getAppProjectTask } from "./tasks";

type AppCollaborationInput =
  | { kind: "note"; projectId: string; entityId: string }
  | { kind: "material"; projectId: string; entityId: string }
  | { kind: "deadline"; entityId: string }
  | { kind: "activity"; projectId: string; entityId: string }
  | { kind: "task"; projectId: string; entityId: string };

type ResolvedCollaborationContext = {
  anchorType: "tree_node" | "source" | "deadline" | "activity" | "task";
  anchorId: string;
  projectId: string;
};

/**
 * Collaboration is operational Project work. Target research-read alone does
 * not grant it, even when the underlying Note or Material remains readable.
 */
async function requireOperationalProjectMember(actor: Principal, projectId: string) {
  const [project, access] = await Promise.all([
    getProject(actor, projectId),
    getProjectApplicationAccess(actor, projectId),
  ]);
  if (project.personalOwnerId && project.personalOwnerId !== actor.userId) throw notFound();
  if (!access.operationalMember) throw notFound();
}

async function resolveContext(
  actor: Principal,
  input: AppCollaborationInput,
): Promise<ResolvedCollaborationContext> {
  switch (input.kind) {
    case "note": {
      const note = await getAppProjectNote(actor, input.projectId, input.entityId);
      await requireOperationalProjectMember(actor, input.projectId);
      return { anchorType: "tree_node", anchorId: note.id, projectId: input.projectId };
    }
    case "material": {
      const material = await getAppProjectMaterial(actor, input.projectId, input.entityId);
      await requireOperationalProjectMember(actor, input.projectId);
      return { anchorType: "source", anchorId: material.id, projectId: input.projectId };
    }
    case "deadline": {
      const deadline = await getDeadline(actor, input.entityId);
      // Calendar only projects confirmed Project deadlines. A legacy deadline
      // has no target route and must not acquire one through collaboration.
      await getProject(actor, deadline.spaceId);
      await requireOperationalProjectMember(actor, deadline.spaceId);
      return { anchorType: "deadline", anchorId: deadline.id, projectId: deadline.spaceId };
    }
    case "activity": {
      await getAppActivityWorkspace(actor, input.projectId, input.entityId);
      await requireOperationalProjectMember(actor, input.projectId);
      return { anchorType: "activity", anchorId: input.entityId, projectId: input.projectId };
    }
    case "task": {
      await getAppProjectTask(actor, input.projectId, input.entityId);
      await requireOperationalProjectMember(actor, input.projectId);
      return { anchorType: "task", anchorId: input.entityId, projectId: input.projectId };
    }
  }
}

export async function getAppCollaborationContext(actor: Principal, input: AppCollaborationInput) {
  const context = await resolveContext(actor, input);
  await authorizeCommentContext(actor, context.anchorType, context.anchorId);
  return {
    projectId: context.projectId,
    mentionCandidates: await listMentionCandidates(actor, context.anchorType, context.anchorId),
  };
}

export async function listAppCollaborationComments(actor: Principal, input: AppCollaborationInput) {
  const context = await resolveContext(actor, input);
  return listComments(actor, context.anchorType, context.anchorId);
}

export async function createAppCollaborationComment(
  actor: Principal,
  input: AppCollaborationInput & { body: string; parentCommentId?: string },
) {
  const context = await resolveContext(actor, input);
  return createComment(actor, {
    anchorType: context.anchorType,
    anchorId: context.anchorId,
    body: input.body,
    parentCommentId: input.parentCommentId,
  });
}

/** Target-only presence adapters retain the existing heartbeat storage. */
export async function markAppCollaborationPresence(actor: Principal, input: AppCollaborationInput) {
  const context = await resolveContext(actor, input);
  await authorizeCommentContext(actor, context.anchorType, context.anchorId);
  await markPresence(actor, `${input.kind}:${context.anchorId}`);
  return listPresence(actor, `${input.kind}:${context.anchorId}`);
}

export async function listAppCollaborationPresence(actor: Principal, input: AppCollaborationInput) {
  const context = await resolveContext(actor, input);
  await authorizeCommentContext(actor, context.anchorType, context.anchorId);
  return listPresence(actor, `${input.kind}:${context.anchorId}`);
}

export async function clearAppCollaborationPresence(
  actor: Principal,
  input: AppCollaborationInput,
) {
  const context = await resolveContext(actor, input);
  await authorizeCommentContext(actor, context.anchorType, context.anchorId);
  await clearPresence(actor, `${input.kind}:${context.anchorId}`);
}

export const listAppNotifications = listNotificationsWithLinks;
export const unreadAppNotificationCount = unreadCount;
export const markAppNotificationRead = markNotificationRead;
export const APP_NOTIFICATION_LIMIT = NOTIFICATION_LIMIT;

export async function getAppDeadline(actor: Principal, deadlineId: string) {
  const deadline = await getDeadline(actor, deadlineId);
  const project = await getProject(actor, deadline.spaceId);
  await requireOperationalProjectMember(actor, project.id);
  return {
    id: deadline.id,
    project: { id: project.id, name: project.name },
    title: deadline.title,
    type: deadline.type,
    dueAt: deadline.dueAt,
    version: deadline.version,
  };
}
