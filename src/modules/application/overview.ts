import type { Principal } from "../auth/principal";
import { listAppMyWorkActivities } from "./activities";
import { listAppProjects } from "./projects";
import { listAppMyWorkTasks } from "./tasks";

export async function getMyWork(actor: Principal) {
  return {
    assignedTasks: await listAppMyWorkTasks(actor),
    activities: await listAppMyWorkActivities(actor),
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
