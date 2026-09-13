import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { notFound } from "@/lib/errors";
import { researchReadableProjectIds } from "../auth/core";
import type { Principal } from "../auth/principal";
import { activities, activityMaterials, activityNotes, activityPeople } from "../activity/schema";
import {
  noteSupportNoteVersions,
  noteSupportSourceVersions,
  treeNodes,
  treeNodeVersions,
} from "../knowledge/schema";
import { persons, projectPeople } from "../person/schema";
import { projects } from "../project/schema";
import { sources, sourceVersions, spaces } from "../storage/schema";

export type AppResearchGraphNodeKind = "project" | "note" | "material" | "person" | "activity";

export type AppResearchGraphNode = {
  id: string;
  kind: AppResearchGraphNodeKind;
  title: string;
  summary: string | null;
  projectId: string;
  projectName: string;
  href: string;
};

export type AppResearchGraphEdge = {
  from: string;
  to: string;
  linkType: "related" | "supports" | "part_of";
};

const key = (kind: AppResearchGraphNodeKind, id: string) => `${kind}:${id}`;

/**
 * Read-only, target-application graph data. It composes only confirmed Project
 * research and operational Activity context already visible to this actor;
 * private drafts, candidates, legacy nodes, and projectless research never
 * enter this read model.
 */
export async function getAppResearchGraph(
  actor: Principal,
  input: { projectId?: string } = {},
): Promise<{
  nodes: AppResearchGraphNode[];
  edges: AppResearchGraphEdge[];
}> {
  const readableProjectIds = await researchReadableProjectIds(actor);
  if (input.projectId && !readableProjectIds.includes(input.projectId)) throw notFound();
  const projectIds = input.projectId ? [input.projectId] : readableProjectIds;
  if (!projectIds.length) return { nodes: [], edges: [] };

  // Activity context remains operational. Core research-read alone is not an
  // Activity-read grant, so it cannot contribute Activity nodes or edges.
  const operationalProjectIds = actor.spaceMemberships
    .map((membership) => membership.spaceId)
    .filter((projectId) => projectIds.includes(projectId));

  const [projectRows, noteRows, materialRows, personRows, activityRows] = await Promise.all([
    db
      .select({ id: projects.projectId, name: spaces.name, summary: projects.description })
      .from(projects)
      .innerJoin(spaces, eq(spaces.id, projects.projectId))
      .where(inArray(projects.projectId, projectIds))
      .orderBy(asc(spaces.name), asc(projects.projectId)),
    db
      .select({
        id: treeNodes.id,
        projectId: treeNodes.projectId,
        title: treeNodes.title,
        summary: treeNodes.summary,
      })
      .from(treeNodes)
      .where(and(inArray(treeNodes.projectId, projectIds), ne(treeNodes.verification, "archived")))
      .orderBy(asc(treeNodes.title), asc(treeNodes.id)),
    db
      .select({
        id: sources.id,
        projectId: sources.spaceId,
        title: sources.title,
        summary: sources.description,
      })
      .from(sources)
      .where(and(inArray(sources.spaceId, projectIds), ne(sources.trustStatus, "archived")))
      .orderBy(asc(sources.title), asc(sources.id)),
    db
      .select({
        id: persons.id,
        title: persons.displayName,
        summary: persons.summary,
        projectId: projectPeople.projectId,
      })
      .from(projectPeople)
      .innerJoin(persons, eq(persons.id, projectPeople.personId))
      .where(inArray(projectPeople.projectId, projectIds))
      .orderBy(asc(persons.displayName), asc(persons.id), asc(projectPeople.projectId)),
    operationalProjectIds.length
      ? db
          .select({
            id: activities.id,
            projectId: activities.projectId,
            title: activities.title,
            summary: activities.summary,
          })
          .from(activities)
          .where(inArray(activities.projectId, operationalProjectIds))
          .orderBy(asc(activities.title), asc(activities.id))
      : Promise.resolve([]),
  ]);

  const projectById = new Map(projectRows.map((project) => [project.id, project]));
  const nodes = new Map<string, AppResearchGraphNode>();
  const addNode = (node: AppResearchGraphNode) => nodes.set(node.id, node);

  for (const project of projectRows) {
    addNode({
      id: key("project", project.id),
      kind: "project",
      title: project.name,
      summary: project.summary,
      projectId: project.id,
      projectName: project.name,
      href: `/app/projects/${encodeURIComponent(project.id)}`,
    });
  }
  for (const note of noteRows) {
    const project = note.projectId ? projectById.get(note.projectId) : undefined;
    if (!project) continue;
    addNode({
      id: key("note", note.id),
      kind: "note",
      title: note.title,
      summary: note.summary,
      projectId: project.id,
      projectName: project.name,
      href: `/app/projects/${encodeURIComponent(project.id)}/notes/${encodeURIComponent(note.id)}`,
    });
  }
  for (const material of materialRows) {
    const project = projectById.get(material.projectId);
    if (!project) continue;
    addNode({
      id: key("material", material.id),
      kind: "material",
      title: material.title,
      summary: material.summary,
      projectId: project.id,
      projectName: project.name,
      href: `/app/projects/${encodeURIComponent(project.id)}/materials/${encodeURIComponent(material.id)}`,
    });
  }
  for (const person of personRows) {
    const project = projectById.get(person.projectId);
    if (!project || nodes.has(key("person", person.id))) continue;
    addNode({
      id: key("person", person.id),
      kind: "person",
      title: person.title,
      summary: person.summary,
      projectId: project.id,
      projectName: project.name,
      href: `/app/people/${encodeURIComponent(person.id)}`,
    });
  }
  for (const activity of activityRows) {
    const project = projectById.get(activity.projectId);
    if (!project) continue;
    addNode({
      id: key("activity", activity.id),
      kind: "activity",
      title: activity.title,
      summary: activity.summary,
      projectId: project.id,
      projectName: project.name,
      href: `/app/projects/${encodeURIComponent(project.id)}/activities/${encodeURIComponent(activity.id)}`,
    });
  }

  const noteIds = noteRows.map((note) => note.id);
  const activityIds = activityRows.map((activity) => activity.id);
  const [
    sourceSupportRows,
    noteSupportRows,
    activityPersonRows,
    activityMaterialRows,
    activityNoteRows,
  ] = await Promise.all([
    noteIds.length
      ? db
          .select({ nodeId: noteSupportSourceVersions.nodeId, sourceId: sources.id })
          .from(noteSupportSourceVersions)
          .innerJoin(
            sourceVersions,
            eq(sourceVersions.id, noteSupportSourceVersions.sourceVersionId),
          )
          .innerJoin(sources, eq(sources.id, sourceVersions.sourceId))
          .where(
            and(
              inArray(noteSupportSourceVersions.nodeId, noteIds),
              inArray(sources.spaceId, projectIds),
            ),
          )
      : Promise.resolve([]),
    noteIds.length
      ? db
          .select({ nodeId: noteSupportNoteVersions.nodeId, supportingNodeId: treeNodes.id })
          .from(noteSupportNoteVersions)
          .innerJoin(
            treeNodeVersions,
            eq(treeNodeVersions.id, noteSupportNoteVersions.noteVersionId),
          )
          .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
          .where(
            and(
              inArray(noteSupportNoteVersions.nodeId, noteIds),
              inArray(treeNodes.projectId, projectIds),
            ),
          )
      : Promise.resolve([]),
    activityIds.length
      ? db
          .select({ activityId: activityPeople.activityId, personId: activityPeople.personId })
          .from(activityPeople)
          .where(inArray(activityPeople.activityId, activityIds))
      : Promise.resolve([]),
    activityIds.length
      ? db
          .select({
            activityId: activityMaterials.activityId,
            sourceId: activityMaterials.sourceId,
          })
          .from(activityMaterials)
          .where(inArray(activityMaterials.activityId, activityIds))
      : Promise.resolve([]),
    activityIds.length
      ? db
          .select({ activityId: activityNotes.activityId, nodeId: activityNotes.nodeId })
          .from(activityNotes)
          .where(inArray(activityNotes.activityId, activityIds))
      : Promise.resolve([]),
  ]);

  const edgeKeys = new Set<string>();
  const edges: AppResearchGraphEdge[] = [];
  const addEdge = (from: string, to: string, linkType: AppResearchGraphEdge["linkType"]) => {
    if (!nodes.has(from) || !nodes.has(to)) return;
    const edgeKey = `${from}:${to}:${linkType}`;
    if (edgeKeys.has(edgeKey)) return;
    edgeKeys.add(edgeKey);
    edges.push({ from, to, linkType });
  };

  for (const note of noteRows)
    if (note.projectId) addEdge(key("project", note.projectId), key("note", note.id), "part_of");
  for (const material of materialRows)
    addEdge(key("project", material.projectId), key("material", material.id), "part_of");
  for (const person of personRows)
    addEdge(key("project", person.projectId), key("person", person.id), "part_of");
  for (const activity of activityRows)
    addEdge(key("project", activity.projectId), key("activity", activity.id), "part_of");
  for (const support of sourceSupportRows)
    addEdge(key("note", support.nodeId), key("material", support.sourceId), "supports");
  for (const support of noteSupportRows)
    addEdge(key("note", support.nodeId), key("note", support.supportingNodeId), "supports");
  for (const relation of activityPersonRows)
    addEdge(key("activity", relation.activityId), key("person", relation.personId), "related");
  for (const relation of activityMaterialRows)
    addEdge(key("activity", relation.activityId), key("material", relation.sourceId), "related");
  for (const relation of activityNoteRows)
    addEdge(key("activity", relation.activityId), key("note", relation.nodeId), "related");

  return { nodes: [...nodes.values()], edges };
}
