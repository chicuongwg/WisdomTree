import type { Principal } from "../auth/principal";
import {
  disableProjectCapability,
  enableProjectCapability,
} from "../project/capabilities";
import {
  createProject,
  getProjectApplicationAccess,
  getProject,
  listProjects,
  updateProject,
} from "../project/service";
import type { AppProjectDto } from "./dto";

async function projectDto(actor: Principal, project: Awaited<ReturnType<typeof getProject>>) {
  const access = await getProjectApplicationAccess(actor, project.id);
  return {
    id: project.id,
    name: project.name,
    researchLens: project.researchLens,
    description: project.description,
    status: project.status,
    ...access,
  } satisfies AppProjectDto;
}

export async function listAppProjects(actor: Principal) {
  const projects = await listProjects(actor);
  return Promise.all(projects.map((project) => projectDto(actor, project)));
}

export async function getProjectWorkspace(actor: Principal, projectId: string) {
  const project = await projectDto(actor, await getProject(actor, projectId));
  return {
    project,
    modules: {
      notes: true,
      materials: true,
      activities: project.operationalMember,
      tasks: project.operationalMember,
      people: true,
      library: project.features.libraryCirculation,
    },
  };
}

export async function createAppProject(
  actor: Principal,
  input: Parameters<typeof createProject>[1],
) {
  return projectDto(actor, await createProject(actor, input));
}

export async function updateAppProject(
  actor: Principal,
  projectId: string,
  input: Parameters<typeof updateProject>[2],
) {
  return projectDto(actor, await updateProject(actor, projectId, input));
}

export const enableAppProjectCapability = enableProjectCapability;
export const disableAppProjectCapability = disableProjectCapability;
