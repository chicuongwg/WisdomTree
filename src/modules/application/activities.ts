import type { Principal } from "../auth/principal";
import {
  addActivityMaterial,
  addActivityNote,
  addActivityParticipant,
  createProjectActivity,
  getActivity,
  listActivityMaterials,
  listActivityNotes,
  listActivityParticipants,
  listActivityTasks,
  listProjectActivities,
  removeActivityMaterial,
  removeActivityNote,
  removeActivityParticipant,
  updateActivity,
} from "../activity/service";
import { getProjectApplicationAccess } from "../project/service";

const activityDto = (activity: Awaited<ReturnType<typeof getActivity>>) => ({
  id: activity.id,
  projectId: activity.projectId,
  title: activity.title,
  type: activity.activityType,
  summary: activity.summary,
  status: activity.status,
  version: activity.version,
  createdAt: activity.createdAt,
  updatedAt: activity.updatedAt,
});

export async function listAppProjectActivities(actor: Principal, projectId: string) {
  return (await listProjectActivities(actor, projectId)).map(activityDto);
}

export async function getAppActivity(actor: Principal, activityId: string) {
  const [activity, participants, materials, notes, tasks] = await Promise.all([
    getActivity(actor, activityId),
    listActivityParticipants(actor, activityId),
    listActivityMaterials(actor, activityId),
    listActivityNotes(actor, activityId),
    listActivityTasks(actor, activityId),
  ]);
  const access = await getProjectApplicationAccess(actor, activity.projectId);
  return {
    ...activityDto(activity),
    participants,
    materials: materials.map((item) => ({
      id: item.sourceId,
      title: item.title,
      description: item.description,
    })),
    notes: notes.map((note) => ({
      id: note.nodeId,
      title: note.title,
      summary: note.summary,
      researchPurpose: note.researchPurpose,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId!,
      activityId: task.activityId,
      title: task.title,
      state: task.state,
      assignedTo: task.assignedTo,
      dueAt: task.dueAt,
      version: task.version,
    })),
    capabilities: { canEdit: access.capabilities.canCreateActivity },
  };
}

export async function createAppProjectActivity(
  actor: Principal,
  input: { projectId: string; title: string; type?: string | null; summary?: string | null },
) {
  return activityDto(
    await createProjectActivity(actor, {
      projectId: input.projectId,
      title: input.title,
      activityType: input.type,
      summary: input.summary,
    }),
  );
}

export async function updateAppActivity(
  actor: Principal,
  input: Parameters<typeof updateActivity>[1],
) {
  return activityDto(await updateActivity(actor, input));
}
export const addAppActivityParticipant = addActivityParticipant;
export const removeAppActivityParticipant = removeActivityParticipant;
export const addAppActivityMaterial = addActivityMaterial;
export const removeAppActivityMaterial = removeActivityMaterial;
export const addAppActivityNote = addActivityNote;
export const removeAppActivityNote = removeActivityNote;
