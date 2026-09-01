import type { Principal } from "../auth/principal";
import { listAppProjectActivities } from "./activities";
import { listAppProjects } from "./projects";
import { listAppProjectTasks } from "./tasks";

export async function getMyWork(actor: Principal) {
  const projects = (await listAppProjects(actor)).filter((project) => project.operationalMember);
  const taskGroups = await Promise.all(
    projects.map(async (project) => ({
      project: { id: project.id, name: project.name },
      tasks: (await listAppProjectTasks(actor, project.id)).filter(
        (task) => task.assignedTo === actor.userId && task.state !== "archived",
      ),
    })),
  );
  const activityGroups = await Promise.all(
    projects.map(async (project) => ({
      project: { id: project.id, name: project.name },
      activities: (await listAppProjectActivities(actor, project.id)).filter(
        (activity) => activity.status !== "cancelled",
      ),
    })),
  );
  return {
    assignedTasks: taskGroups.flatMap(({ project, tasks }) =>
      tasks.map((task) => ({ ...task, project })),
    ),
    activities: activityGroups.flatMap(({ project, activities }) =>
      activities.map((activity) => ({ ...activity, project })),
    ),
  };
}

export async function getTmktOverview(actor: Principal) {
  const [projects, myWork] = await Promise.all([listAppProjects(actor), getMyWork(actor)]);
  return {
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      operationalMember: project.operationalMember,
      features: project.features,
    })),
    myWork: {
      assignedTaskCount: myWork.assignedTasks.length,
      activeActivityCount: myWork.activities.length,
    },
  };
}
