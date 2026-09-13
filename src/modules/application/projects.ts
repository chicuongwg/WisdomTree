import type { Principal } from "../auth/principal";
import { notFound } from "@/lib/errors";
import {
  disableProjectCapability,
  enableProjectCapability,
  listProjectCapabilities,
} from "../project/capabilities";
import {
  createProject,
  ensurePersonalProject,
  getProjectApplicationAccess,
  listProjectApplicationAccess,
  getProject,
  listProjects,
  requireSharedProjectMembershipManagement,
  updateProject,
} from "../project/service";
import {
  addSpaceMember,
  listSpaceMemberCandidates,
  listSpaceMembers,
  removeSpaceMember,
  setSpaceMemberRole,
} from "../storage/service";
import { createSpaceRelease } from "../export/service";
import type { AppProjectDto } from "./dto";

async function projectDto(actor: Principal, project: Awaited<ReturnType<typeof getProject>>) {
  const access = await getProjectApplicationAccess(actor, project.id);
  return {
    id: project.id,
    name: project.name,
    version: project.version,
    researchLens: project.researchLens,
    description: project.description,
    status: project.status,
    personalOwnerId: project.personalOwnerId,
    isPersonal: project.personalOwnerId === actor.userId,
    ...access,
  } satisfies AppProjectDto;
}

export async function listAppProjects(actor: Principal) {
  const projects = await listProjects(actor);
  const access = await listProjectApplicationAccess(
    actor,
    projects.map((project) => project.id),
  );
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    version: project.version,
    researchLens: project.researchLens,
    description: project.description,
    status: project.status,
    personalOwnerId: project.personalOwnerId,
    isPersonal: project.personalOwnerId === actor.userId,
    ...access.get(project.id)!,
  })) satisfies AppProjectDto[];
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
      library: project.features.libraryCirculation && project.operationalMember,
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

async function requireAppProject(actor: Principal, projectId: string) {
  return getProject(actor, projectId);
}

export async function listAppProjectMembers(actor: Principal, projectId: string) {
  await requireAppProject(actor, projectId);
  return listSpaceMembers(actor, projectId);
}

export async function listAppProjectMemberCandidates(actor: Principal, projectId: string) {
  await requireAppProject(actor, projectId);
  return listSpaceMemberCandidates(actor, projectId);
}

export async function addAppProjectMember(
  actor: Principal,
  input: { projectId: string; userId: string; memberRole?: "viewer" | "contributor" | "manager" },
) {
  await requireSharedProjectMembershipManagement(actor, input.projectId);
  await addSpaceMember(actor, input.projectId, input.userId, input.memberRole);
}

export async function updateAppProjectMemberRole(
  actor: Principal,
  input: { projectId: string; userId: string; memberRole: "viewer" | "contributor" | "manager" },
) {
  await requireSharedProjectMembershipManagement(actor, input.projectId);
  await setSpaceMemberRole(actor, input.projectId, input.userId, input.memberRole);
}

export async function removeAppProjectMember(
  actor: Principal,
  input: { projectId: string; userId: string },
) {
  await requireSharedProjectMembershipManagement(actor, input.projectId);
  await removeSpaceMember(actor, input.projectId, input.userId);
}

export async function listAppProjectCapabilities(actor: Principal, projectId: string) {
  await requireAppProject(actor, projectId);
  return listProjectCapabilities(actor, projectId);
}

export const ensureAppPersonalProject = ensurePersonalProject;

/** Project export reuses the verified release manifest, without exposing WikiRelease UI. */
export async function createAppProjectExport(actor: Principal, projectId: string) {
  const project = await getProject(actor, projectId);
  if (project.personalOwnerId) throw notFound();
  return createSpaceRelease(actor, projectId);
}
