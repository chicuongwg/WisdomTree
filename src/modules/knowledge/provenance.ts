import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notFound } from "@/lib/errors";
import type { Principal } from "../auth/principal";
import { requireProjectResearchRead } from "../auth/core";
import { activities, activityMaterials, activityNotes, activityPeople } from "../activity/schema";
import { persons } from "../person/schema";
import { projects } from "../project/schema";
import { spaces } from "../storage/schema";
import { treeNodes, treeNodeVersions } from "./schema";
import { listNoteVersionSupportingResearch } from "./support";

type ProjectContext = { id: string; name: string };
type ActivityContext = {
  id: string;
  title: string;
  project: ProjectContext;
  people: Array<{ id: string; displayName: string; roleLabel: string | null }>;
};

function operationalProjectIds(actor: Principal) {
  return actor.spaceMemberships.map((membership) => membership.spaceId);
}

function indexActivityContexts(
  links: Array<{
    referenceId: string;
    activityId: string;
    title: string;
    projectId: string;
    projectName: string;
  }>,
  people: Array<{
    activityId: string;
    personId: string;
    displayName: string;
    roleLabel: string | null;
  }>,
) {
  const peopleByActivity = new Map<string, ActivityContext["people"]>();
  for (const person of people) {
    const entries = peopleByActivity.get(person.activityId) ?? [];
    entries.push({
      id: person.personId,
      displayName: person.displayName,
      roleLabel: person.roleLabel,
    });
    peopleByActivity.set(person.activityId, entries);
  }
  const result = new Map<string, ActivityContext[]>();
  for (const link of links) {
    const entries = result.get(link.referenceId) ?? [];
    entries.push({
      id: link.activityId,
      title: link.title,
      project: { id: link.projectId, name: link.projectName },
      people: peopleByActivity.get(link.activityId) ?? [],
    });
    result.set(link.referenceId, entries);
  }
  return result;
}

/**
 * Compose the research provenance available for one exact official Note version.
 * Activity contexts deliberately remain operational: Core research read alone does
 * not reveal them without a real membership in their Project.
 */
export async function getNoteResearchProvenance(actor: Principal, noteVersionId: string) {
  const [target] = await db
    .select({
      noteId: treeNodes.id,
      noteVersionId: treeNodeVersions.id,
      version: treeNodeVersions.seq,
      projectId: projects.projectId,
      projectName: spaces.name,
    })
    .from(treeNodeVersions)
    .innerJoin(treeNodes, eq(treeNodes.id, treeNodeVersions.nodeId))
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .innerJoin(spaces, eq(spaces.id, projects.projectId))
    .where(eq(treeNodeVersions.id, noteVersionId));
  if (!target) throw notFound();
  await requireProjectResearchRead(actor, target.projectId);

  const support = await listNoteVersionSupportingResearch(actor, noteVersionId);
  const memberProjectIds = operationalProjectIds(actor);
  const sourceIds = support.sourceVersions.map((item) => item.sourceId);
  const noteIds = support.noteVersions.map((item) => item.supportingNodeId);

  const [sourceActivityLinks, noteActivityLinks] = memberProjectIds.length
    ? await Promise.all([
        sourceIds.length
          ? db
              .select({
                referenceId: activityMaterials.sourceId,
                activityId: activities.id,
                title: activities.title,
                projectId: activities.projectId,
                projectName: spaces.name,
              })
              .from(activityMaterials)
              .innerJoin(
                activities,
                and(
                  eq(activities.id, activityMaterials.activityId),
                  eq(activities.projectId, activityMaterials.projectId),
                ),
              )
              .innerJoin(spaces, eq(spaces.id, activities.projectId))
              .where(
                and(
                  inArray(activityMaterials.sourceId, sourceIds),
                  inArray(activities.projectId, memberProjectIds),
                ),
              )
              .orderBy(asc(activities.title), asc(activities.id))
          : Promise.resolve([]),
        noteIds.length
          ? db
              .select({
                referenceId: activityNotes.nodeId,
                activityId: activities.id,
                title: activities.title,
                projectId: activities.projectId,
                projectName: spaces.name,
              })
              .from(activityNotes)
              .innerJoin(
                activities,
                and(
                  eq(activities.id, activityNotes.activityId),
                  eq(activities.projectId, activityNotes.projectId),
                ),
              )
              .innerJoin(spaces, eq(spaces.id, activities.projectId))
              .where(
                and(
                  inArray(activityNotes.nodeId, noteIds),
                  inArray(activities.projectId, memberProjectIds),
                ),
              )
              .orderBy(asc(activities.title), asc(activities.id))
          : Promise.resolve([]),
      ])
    : [[], []];
  const activityIds = [
    ...new Set([...sourceActivityLinks, ...noteActivityLinks].map((row) => row.activityId)),
  ];
  const activityPeopleRows = activityIds.length
    ? await db
        .select({
          activityId: activityPeople.activityId,
          personId: persons.id,
          displayName: persons.displayName,
          roleLabel: activityPeople.roleLabel,
        })
        .from(activityPeople)
        .innerJoin(persons, eq(persons.id, activityPeople.personId))
        .where(inArray(activityPeople.activityId, activityIds))
        .orderBy(asc(persons.displayName), asc(persons.id))
    : [];
  const sourceActivities = indexActivityContexts(sourceActivityLinks, activityPeopleRows);
  const noteActivities = indexActivityContexts(noteActivityLinks, activityPeopleRows);

  return {
    target: {
      noteId: target.noteId,
      noteVersionId: target.noteVersionId,
      version: target.version,
      project: { id: target.projectId, name: target.projectName },
    },
    snapshotStatus: support.snapshotStatus,
    supportingMaterials: support.sourceVersions.map((item) => ({
      material: { id: item.sourceId, title: item.title },
      materialVersion: { id: item.sourceVersionId, version: item.seq },
      project: { id: item.projectId },
      activities: sourceActivities.get(item.sourceId) ?? [],
    })),
    supportingNotes: support.noteVersions.map((item) => ({
      note: { id: item.supportingNodeId, title: item.title },
      noteVersion: { id: item.noteVersionId, version: item.seq },
      project: { id: item.projectId },
      activities: noteActivities.get(item.supportingNodeId) ?? [],
    })),
  };
}
