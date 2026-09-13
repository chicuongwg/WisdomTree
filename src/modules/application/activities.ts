import type { Principal } from "../auth/principal";
import { notFound } from "@/lib/errors";
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
  listMyProjectActivities,
  listProjectActivities,
  removeActivityMaterial,
  removeActivityNote,
  removeActivityParticipant,
  updateActivity,
} from "../activity/service";
import { getProjectApplicationAccess } from "../project/service";
import { listAppProjectMaterials } from "./materials";
import { listAppProjectNotes } from "./notes";
import { listAppProjectPeople } from "./people";
import { listAppProjectTasks } from "./tasks";

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

export async function listAppMyWorkActivities(actor: Principal) {
  return (await listMyProjectActivities(actor)).map(({ activity }) => activityDto(activity));
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

/** One bounded, Project-safe DTO for the Activity detail workspace. */
export async function getAppActivityWorkspace(
  actor: Principal,
  projectId: string,
  activityId: string,
) {
  const activity = await getAppActivity(actor, activityId);
  if (activity.projectId !== projectId) {
    throw notFound();
  }
  const [people, materials, noteCollection, tasks] = await Promise.all([
    listAppProjectPeople(actor, projectId),
    listAppProjectMaterials(actor, projectId),
    listAppProjectNotes(actor, projectId),
    listAppProjectTasks(actor, projectId),
  ]);
  return {
    activity,
    availablePeople: people,
    availableMaterials: materials,
    availableNotes: noteCollection.notes,
    availableTasks: tasks,
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
