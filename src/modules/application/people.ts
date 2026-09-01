import type { Principal } from "../auth/principal";
import {
  attachPersonToProject,
  createProjectPerson,
  getPerson,
  listProjectPeople,
  searchAccessiblePeople,
  updatePerson,
} from "../person/service";

export async function listAppProjectPeople(actor: Principal, projectId: string) {
  return (await listProjectPeople(actor, projectId)).map((person) => ({
    id: person.id,
    displayName: person.displayName,
    summary: person.summary,
    version: person.version,
  }));
}

export async function getAppPerson(actor: Principal, personId: string) {
  const person = await getPerson(actor, personId);
  return {
    id: person.id,
    displayName: person.displayName,
    summary: person.summary,
    projectIds: person.projectIds,
    version: person.version,
  };
}

export const searchAppPeople = searchAccessiblePeople;
export async function createAppProjectPerson(
  actor: Principal,
  input: Parameters<typeof createProjectPerson>[1],
) {
  const person = await createProjectPerson(actor, input);
  return {
    id: person.id,
    displayName: person.displayName,
    summary: person.summary,
    version: person.version,
  };
}
export const attachAppPersonToProject = attachPersonToProject;
export async function updateAppPerson(actor: Principal, input: Parameters<typeof updatePerson>[1]) {
  const person = await updatePerson(actor, input);
  return {
    id: person.id,
    displayName: person.displayName,
    summary: person.summary,
    version: person.version,
  };
}
