import { notFound } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import {
  attachTaskToActivity,
  createProjectTask,
  detachTaskFromActivity,
  listProjectTasks,
  updateTask,
} from "../pm/service";

const taskDto = (task: Awaited<ReturnType<typeof listProjectTasks>>[number]) => ({
  id: task.id,
  projectId: task.projectId!,
  activityId: task.activityId,
  title: task.title,
  state: task.state,
  assignedTo: task.assignedTo,
  assigneeName: task.assigneeName,
  startAt: task.startAt,
  dueAt: task.dueAt,
  notes: task.notes,
  version: task.version,
});

export async function listAppProjectTasks(actor: Principal, projectId: string) {
  return (await listProjectTasks(actor, projectId)).map(taskDto);
}

export async function getAppProjectTask(actor: Principal, projectId: string, taskId: string) {
  const task = (await listProjectTasks(actor, projectId)).find((row) => row.id === taskId);
  if (!task) throw notFound();
  return taskDto(task);
}

export async function createAppProjectTask(
  actor: Principal,
  input: {
    projectId: string;
    activityId?: string | null;
    title: string;
    assigneeId?: string | null;
    startAt?: string | null;
    dueAt?: string | null;
    notes?: string | null;
  },
) {
  const task = await createProjectTask(actor, input);
  return {
    id: task.id,
    projectId: task.projectId!,
    activityId: task.activityId,
    title: task.title,
    state: task.state,
    assignedTo: task.assignedTo,
    assigneeName: null,
    startAt: task.startAt,
    dueAt: task.dueAt,
    notes: task.notes,
    version: task.version,
  };
}

export async function updateAppProjectTask(
  actor: Principal,
  projectId: string,
  taskId: string,
  input: Parameters<typeof updateTask>[2],
) {
  const existing = (await listProjectTasks(actor, projectId)).find((task) => task.id === taskId);
  if (!existing) throw notFound();
  await updateTask(actor, taskId, input);
  const updated = (await listProjectTasks(actor, projectId)).find((task) => task.id === taskId);
  if (!updated) throw notFound();
  return taskDto(updated);
}

export const attachAppTaskToActivity = attachTaskToActivity;
export const detachAppTaskFromActivity = detachTaskFromActivity;
