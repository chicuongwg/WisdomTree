import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { authorize } from "../auth/authorize";
import { requireProjectResearchRead, researchReadableProjectIds } from "../auth/core";
import type { Principal } from "../auth/principal";
import { recordAudit } from "../audit/service";
import { projects } from "../project/schema";
import { activities, activityPeople } from "../activity/schema";
import { spaces } from "../storage/schema";
import { persons, projectPeople } from "./schema";

function requiredText(value: string | undefined, code: string, message: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new ApiError(400, code, message);
  return normalized;
}

function optionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

async function requireReadableProject(actor: Principal, projectId: string) {
  const [project] = await db
    .select({ projectId: projects.projectId })
    .from(projects)
    .where(eq(projects.projectId, projectId));
  if (!project) throw notFound();
  await requireProjectResearchRead(actor, project.projectId);
  return project;
}

async function requireWritableProject(actor: Principal, projectId: string) {
  const project = await requireReadableProject(actor, projectId);
  authorize(actor, "project.person.manage", { spaceId: project.projectId, kind: "write" });
  return project;
}

async function requireAccessiblePerson(actor: Principal, personId: string) {
  const visibleProjects = await researchReadableProjectIds(actor);
  if (!visibleProjects.length) throw notFound();
  const [person] = await db
    .select({ person: persons })
    .from(persons)
    .innerJoin(projectPeople, eq(projectPeople.personId, persons.id))
    .innerJoin(projects, eq(projects.projectId, projectPeople.projectId))
    .where(and(eq(persons.id, personId), inArray(projectPeople.projectId, visibleProjects)))
    .limit(1);
  if (!person) throw notFound();
  return person.person;
}

export async function createProjectPerson(
  actor: Principal,
  input: { projectId: string; displayName?: string; summary?: string | null },
) {
  const project = await requireWritableProject(actor, input.projectId);
  const displayName = requiredText(
    input.displayName,
    "invalid_person",
    "Person display name must not be empty.",
  );
  const summary = optionalText(input.summary) ?? null;

  return db.transaction(async (tx) => {
    const [person] = await tx
      .insert(persons)
      .values({ displayName, summary, createdBy: actor.userId })
      .returning();
    await tx.insert(projectPeople).values({
      projectId: project.projectId,
      personId: person.id,
      createdBy: actor.userId,
    });
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "person.create",
      targetType: "person",
      targetId: person.id,
      details: { projectId: project.projectId },
    });
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "project.person.attach",
      targetType: "person",
      targetId: person.id,
      details: { personId: person.id, projectId: project.projectId },
    });
    return person;
  });
}

export async function attachPersonToProject(
  actor: Principal,
  input: { projectId: string; personId: string },
) {
  const project = await requireWritableProject(actor, input.projectId);
  await requireAccessiblePerson(actor, input.personId);
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projectPeople)
      .values({
        projectId: project.projectId,
        personId: input.personId,
        createdBy: actor.userId,
      })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await recordAudit(tx, actor, {
        accountability: "editor_updater",
        action: "project.person.attach",
        targetType: "person",
        targetId: input.personId,
        details: { personId: input.personId, projectId: project.projectId },
      });
    }
    return { personId: input.personId, projectId: project.projectId, created: Boolean(created) };
  });
}

export async function getPerson(actor: Principal, personId: string) {
  const person = await requireAccessiblePerson(actor, personId);
  const visibleProjects = await researchReadableProjectIds(actor);
  const linkedProjects = await db
    .select({ projectId: projectPeople.projectId })
    .from(projectPeople)
    .innerJoin(projects, eq(projects.projectId, projectPeople.projectId))
    .where(
      and(eq(projectPeople.personId, person.id), inArray(projectPeople.projectId, visibleProjects)),
    )
    .orderBy(asc(projectPeople.projectId));
  return { ...person, projectIds: linkedProjects.map((row) => row.projectId) };
}

/**
 * Canonical Person detail. Activity context is intentionally limited to real
 * Project membership, preserving the Stage 12 operational boundary for Core.
 */
export async function getPersonResearchContext(actor: Principal, personId: string) {
  const person = await requireAccessiblePerson(actor, personId);
  const visibleProjects = await researchReadableProjectIds(actor);
  const memberProjectIds = actor.spaceMemberships.map((membership) => membership.spaceId);
  const [linkedProjects, activityRows] = await Promise.all([
    db
      .select({ projectId: projects.projectId, projectName: spaces.name })
      .from(projectPeople)
      .innerJoin(projects, eq(projects.projectId, projectPeople.projectId))
      .innerJoin(spaces, eq(spaces.id, projects.projectId))
      .where(
        and(
          eq(projectPeople.personId, personId),
          inArray(projectPeople.projectId, visibleProjects),
        ),
      )
      .orderBy(asc(spaces.name), asc(projects.projectId)),
    memberProjectIds.length
      ? db
          .select({
            id: activities.id,
            title: activities.title,
            activityType: activities.activityType,
            status: activities.status,
            roleLabel: activityPeople.roleLabel,
            projectId: projects.projectId,
            projectName: spaces.name,
          })
          .from(activityPeople)
          .innerJoin(
            activities,
            and(
              eq(activities.id, activityPeople.activityId),
              eq(activities.projectId, activityPeople.projectId),
            ),
          )
          .innerJoin(projects, eq(projects.projectId, activities.projectId))
          .innerJoin(spaces, eq(spaces.id, projects.projectId))
          .where(
            and(
              eq(activityPeople.personId, personId),
              inArray(activities.projectId, memberProjectIds),
            ),
          )
          .orderBy(asc(activities.title), asc(activities.id))
      : Promise.resolve([]),
  ]);
  return {
    ...person,
    projectIds: linkedProjects.map((project) => project.projectId),
    projects: linkedProjects.map((project) => ({
      id: project.projectId,
      name: project.projectName,
    })),
    activities: activityRows.map((activity) => ({
      id: activity.id,
      title: activity.title,
      activityType: activity.activityType,
      status: activity.status,
      roleLabel: activity.roleLabel,
      project: { id: activity.projectId, name: activity.projectName },
    })),
  };
}

export async function listProjectPeople(actor: Principal, projectId: string) {
  const project = await requireReadableProject(actor, projectId);
  return db
    .select({
      id: persons.id,
      displayName: persons.displayName,
      summary: persons.summary,
      createdAt: persons.createdAt,
      updatedAt: persons.updatedAt,
      version: persons.version,
    })
    .from(projectPeople)
    .innerJoin(persons, eq(persons.id, projectPeople.personId))
    .where(eq(projectPeople.projectId, project.projectId))
    .orderBy(asc(persons.displayName), asc(persons.id));
}

export async function searchAccessiblePeople(actor: Principal, query?: string) {
  const visibleProjects = await researchReadableProjectIds(actor);
  if (!visibleProjects.length) return [];
  const normalized = query?.trim();
  return db
    .selectDistinct({
      id: persons.id,
      displayName: persons.displayName,
      summary: persons.summary,
      updatedAt: persons.updatedAt,
      version: persons.version,
    })
    .from(persons)
    .innerJoin(projectPeople, eq(projectPeople.personId, persons.id))
    .innerJoin(projects, eq(projects.projectId, projectPeople.projectId))
    .where(
      and(
        inArray(projectPeople.projectId, visibleProjects),
        normalized ? ilike(persons.displayName, `%${normalized}%`) : undefined,
      ),
    )
    .orderBy(asc(persons.displayName), asc(persons.id))
    .limit(50);
}

export async function updatePerson(
  actor: Principal,
  input: {
    personId: string;
    displayName?: string;
    summary?: string | null;
    expectedVersion?: number;
  },
) {
  const existing = await requireAccessiblePerson(actor, input.personId);
  const linkedProjects = await db
    .select({ projectId: projectPeople.projectId })
    .from(projectPeople)
    .innerJoin(projects, eq(projects.projectId, projectPeople.projectId))
    .where(eq(projectPeople.personId, input.personId));
  const writableProject = linkedProjects.find((row) =>
    actor.spaceMemberships.some(
      (membership) => membership.spaceId === row.projectId && membership.role !== "viewer",
    ),
  );
  if (!writableProject) {
    authorize(actor, "project.person.manage", {
      spaceId: linkedProjects[0]?.projectId,
      kind: "write",
    });
    throw new ApiError(403, "forbidden", "Access denied.");
  }
  authorize(actor, "project.person.manage", {
    spaceId: writableProject.projectId,
    kind: "write",
  });

  if (typeof input.expectedVersion !== "number") throw versionConflict();
  const expectedVersion = input.expectedVersion;
  const displayName =
    input.displayName === undefined
      ? undefined
      : requiredText(input.displayName, "invalid_person", "Person display name must not be empty.");
  const summary = optionalText(input.summary);
  if (displayName === undefined && summary === undefined) {
    throw new ApiError(400, "invalid_person", "No Person metadata changes were provided.");
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(persons)
      .set({
        ...(displayName !== undefined ? { displayName } : {}),
        ...(summary !== undefined ? { summary } : {}),
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(persons.id, input.personId), eq(persons.version, expectedVersion)))
      .returning();
    if (!updated) throw versionConflict();
    const changedFields = [
      ...(displayName !== undefined ? ["displayName"] : []),
      ...(summary !== undefined ? ["summary"] : []),
    ];
    await recordAudit(tx, actor, {
      accountability: "editor_updater",
      action: "person.update",
      targetType: "person",
      targetId: updated.id,
      details: { personId: updated.id, changedFields },
    });
    return updated;
  });
}
