import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  addAppActivityMaterial,
  addAppActivityNote,
  addAppActivityParticipant,
  createAppProjectActivity,
  createAppProjectMaterial,
  createAppProjectNote,
  createAppProjectPerson,
  getAppResearchGraph,
  publishAppDraft,
} from "@/modules/application";
import { inviteUser } from "@/modules/auth/admin";
import { grantTmktCore } from "@/modules/auth/core";
import { createProject } from "@/modules/project/service";
import { addSpaceMember } from "@/modules/storage/service";
import { principalFor } from "../setup";

const graphKey = (kind: string, id: string) => `${kind}:${id}`;

export async function run() {
  const initialAdmin = await principalFor("huong@wisdomtree.local");
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const project = await createProject(initialAdmin, {
    name: `Stage 17.11 Graph ${suffix}`,
    researchLens: "Authorized research visualization",
  });
  const manager = await principalFor("huong@wisdomtree.local");
  const contributorEmail = `stage1711-contributor-${suffix}@wisdomtree.local`;
  const coreEmail = `stage1711-core-${suffix}@wisdomtree.local`;
  const outsiderEmail = `stage1711-outsider-${suffix}@wisdomtree.local`;
  const contributorUser = await inviteUser(manager, {
    email: contributorEmail,
    displayName: "Stage 17.11 contributor",
  });
  const coreUser = await inviteUser(manager, {
    email: coreEmail,
    displayName: "Stage 17.11 Core reader",
  });
  await inviteUser(manager, { email: outsiderEmail, displayName: "Stage 17.11 outsider" });
  await addSpaceMember(manager, project.id, contributorUser.id, "contributor");
  const contributor = await principalFor(contributorEmail);

  const privateDraft = await createAppProjectNote(contributor, {
    projectId: project.id,
    title: `Private Graph draft ${suffix}`,
    contentMd: "private-stage1711-graph-token",
  });
  const officialDraft = await createAppProjectNote(contributor, {
    projectId: project.id,
    title: `Official Graph note ${suffix}`,
    contentMd: "official-stage1711-graph-token",
  });
  const official = await publishAppDraft(contributor, officialDraft.id);
  const material = await createAppProjectMaterial(contributor, {
    projectId: project.id,
    title: `Graph Material ${suffix}`,
  });
  const person = await createAppProjectPerson(contributor, {
    projectId: project.id,
    displayName: `Graph Person ${suffix}`,
  });
  const activity = await createAppProjectActivity(contributor, {
    projectId: project.id,
    title: `Graph Activity ${suffix}`,
  });
  await addAppActivityParticipant(contributor, { activityId: activity.id, personId: person.id });
  await addAppActivityMaterial(contributor, { activityId: activity.id, sourceId: material.id });
  await addAppActivityNote(contributor, { activityId: activity.id, nodeId: official.nodeId });

  const graph = await getAppResearchGraph(contributor);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  assert.equal(nodeById.get(graphKey("project", project.id))?.href, `/app/projects/${project.id}`);
  assert.equal(
    nodeById.get(graphKey("note", official.nodeId))?.href,
    `/app/projects/${project.id}/notes/${official.nodeId}`,
  );
  assert.equal(
    nodeById.get(graphKey("material", material.id))?.href,
    `/app/projects/${project.id}/materials/${material.id}`,
  );
  assert.equal(nodeById.get(graphKey("person", person.id))?.href, `/app/people/${person.id}`);
  assert.equal(
    nodeById.get(graphKey("activity", activity.id))?.href,
    `/app/projects/${project.id}/activities/${activity.id}`,
  );
  assert.equal(nodeById.has(graphKey("note", privateDraft.id)), false);
  assert.equal(JSON.stringify(graph).includes("private-stage1711-graph-token"), false);
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.from === graphKey("activity", activity.id) &&
        edge.to === graphKey("person", person.id) &&
        edge.linkType === "related",
    ),
  );

  await grantTmktCore(manager, coreUser.id);
  const core = await principalFor(coreEmail);
  const coreGraph = await getAppResearchGraph(core);
  assert.ok(coreGraph.nodes.some((node) => node.id === graphKey("project", project.id)));
  assert.ok(coreGraph.nodes.some((node) => node.id === graphKey("note", official.nodeId)));
  assert.ok(coreGraph.nodes.some((node) => node.id === graphKey("material", material.id)));
  assert.equal(
    coreGraph.nodes.some((node) => node.id === graphKey("activity", activity.id)),
    false,
  );
  assert.equal(
    coreGraph.edges.some((edge) => edge.from === graphKey("activity", activity.id)),
    false,
  );

  const outsider = await principalFor(outsiderEmail);
  const outsiderGraph = await getAppResearchGraph(outsider);
  assert.equal(
    outsiderGraph.nodes.some((node) => node.id === graphKey("project", project.id)),
    false,
  );
}
