import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import { authorize } from "../auth/authorize";
import { requireProjectResearchRead } from "../auth/core";
import type { Principal } from "../auth/principal";
import { recordAudit } from "../audit/service";
import { treeNodes } from "../knowledge/schema";
import { persons, projectPeople } from "../person/schema";
import { projects } from "../project/schema";
import { tasks } from "../pm/schema";
import { sources } from "../storage/schema";
import { spaceMembers } from "../storage/schema";
import {
  activities,
  activityMaterials,
  activityNotes,
  activityPeople,
  type ActivityStatus,
} from "./schema";

const ACTIVITY_STATUSES: ActivityStatus[] = ["planned", "active", "completed", "cancelled"];

function requiredText(value: string | undefined, code: string, message: string) {
  const normalized = value?.trim();
  if (!normalized) throw new ApiError(400, code, message);
  return normalized;
}

function optionalText(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

function shortLabel(value: string | null | undefined, field: string) {
  const normalized = optionalText(value);
  if (normalized && normalized.length > 80) {
    throw new ApiError(400, "invalid_activity", `${field} must be 80 characters or fewer.`);
  }
  return normalized;
}

async function requireProject(actor: Principal, projectId: string, kind: "read" | "write") {
  const [project] = await db
    .select({ projectId: projects.projectId })
    .from(projects)
    .where(eq(projects.projectId, projectId));
  if (!project) throw notFound();
  await requireProjectResearchRead(actor, project.projectId);
  authorize(actor, "project.activity.read", { spaceId: project.projectId, kind: "read" });
  if (kind === "write") {
    authorize(actor, "project.activity.manage", { spaceId: project.projectId, kind: "write" });
  }
  return project;
}

async function requireActivity(actor: Principal, activityId: string, kind: "read" | "write") {
  const [activity] = await db
    .select()
    .from(activities)
    .innerJoin(projects, eq(projects.projectId, activities.projectId))
    .where(eq(activities.id, activityId));
  if (!activity) throw notFound();
  await requireProjectResearchRead(actor, activity.projects.projectId);
  authorize(actor, "project.activity.read", {
    spaceId: activity.activities.projectId,
    kind: "read",
  });
  if (kind === "write") {
    authorize(actor, "project.activity.manage", {
      spaceId: activity.activities.projectId,
      kind: "write",
    });
  }
  return activity.activities;
}

export async function createProjectActivity(
  actor: Principal,
  input: {
    projectId: string;
    title?: string;
    activityType?: string | null;
    summary?: string | null;
  },
) {
  const project = await requireProject(actor, input.projectId, "write");
  const title = requiredText(input.title, "invalid_activity", "Activity title must not be empty.");
  const activityType = shortLabel(input.activityType, "Activity type") ?? null;
  const summary = optionalText(input.summary) ?? null;
  return db.transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({
        projectId: project.projectId,
        title,
        activityType,
        summary,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "activity.create",
      targetType: "activity",
      targetId: activity.id,
      details: { projectId: activity.projectId, status: activity.status },
    });
    return activity;
  });
}

export async function getActivity(actor: Principal, activityId: string) {
  return requireActivity(actor, activityId, "read");
}

export async function listProjectActivities(actor: Principal, projectId: string) {
  const project = await requireProject(actor, projectId, "read");
  return db
    .select()
    .from(activities)
    .where(eq(activities.projectId, project.projectId))
    .orderBy(desc(activities.updatedAt), asc(activities.title));
}

/** Current actor's operational Activities across their current Project memberships. */
export async function listMyProjectActivities(actor: Principal) {
  return db
    .select({ activity: activities, projectId: projects.projectId })
    .from(activities)
    .innerJoin(projects, eq(projects.projectId, activities.projectId))
    .innerJoin(
      spaceMembers,
      and(eq(spaceMembers.spaceId, activities.projectId), eq(spaceMembers.userId, actor.userId)),
    )
    .where(ne(activities.status, "cancelled"))
    .orderBy(desc(activities.updatedAt), asc(activities.title));
}

export async function updateActivity(
  actor: Principal,
  input: {
    activityId: string;
    title?: string;
    activityType?: string | null;
    summary?: string | null;
    status?: string;
    expectedVersion?: number;
  },
) {
  const existing = await requireActivity(actor, input.activityId, "write");
  if (typeof input.expectedVersion !== "number") throw versionConflict();
  const expectedVersion = input.expectedVersion;
  const title =
    input.title === undefined
      ? undefined
      : requiredText(input.title, "invalid_activity", "Activity title must not be empty.");
  const activityType = shortLabel(input.activityType, "Activity type");
  const summary = optionalText(input.summary);
  if (input.status !== undefined && !ACTIVITY_STATUSES.includes(input.status as ActivityStatus)) {
    throw new ApiError(400, "invalid_activity_status", "Invalid Activity status.");
  }
  if (
    title === undefined &&
    activityType === undefined &&
    summary === undefined &&
    input.status === undefined
  ) {
    throw new ApiError(400, "invalid_activity", "No Activity changes were provided.");
  }
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(activities)
      .set({
        ...(title !== undefined ? { title } : {}),
        ...(activityType !== undefined ? { activityType } : {}),
        ...(summary !== undefined ? { summary } : {}),
        ...(input.status !== undefined ? { status: input.status as ActivityStatus } : {}),
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(activities.id, existing.id), eq(activities.version, expectedVersion)))
      .returning();
    if (!updated) throw versionConflict();
    const changedFields = [
      ...(title !== undefined ? ["title"] : []),
      ...(activityType !== undefined ? ["activityType"] : []),
      ...(summary !== undefined ? ["summary"] : []),
      ...(input.status !== undefined ? ["status"] : []),
    ];
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "activity.update",
      targetType: "activity",
      targetId: updated.id,
      details: { projectId: updated.projectId, changedFields },
    });
    return updated;
  });
}

export async function addActivityParticipant(
  actor: Principal,
  input: { activityId: string; personId: string; roleLabel?: string | null },
) {
  const activity = await requireActivity(actor, input.activityId, "write");
  const [person] = await db
    .select({ id: persons.id })
    .from(projectPeople)
    .innerJoin(persons, eq(persons.id, projectPeople.personId))
    .where(
      and(
        eq(projectPeople.projectId, activity.projectId),
        eq(projectPeople.personId, input.personId),
      ),
    );
  if (!person) {
    throw new ApiError(
      400,
      "invalid_activity_person",
      "Person must already be attached to the Activity Project.",
    );
  }
  const roleLabel = shortLabel(input.roleLabel, "Participant role") ?? null;
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(activityPeople)
      .values({
        activityId: activity.id,
        projectId: activity.projectId,
        personId: person.id,
        roleLabel,
        createdBy: actor.userId,
      })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await recordAudit(tx, actor, {
        accountability: "member",
        action: "activity.person.add",
        targetType: "activity",
        targetId: activity.id,
        details: { projectId: activity.projectId, personId: person.id },
      });
    }
    return { created: Boolean(created) };
  });
}

export async function removeActivityParticipant(
  actor: Principal,
  input: { activityId: string; personId: string },
) {
  const activity = await requireActivity(actor, input.activityId, "write");
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(activityPeople)
      .where(
        and(
          eq(activityPeople.activityId, activity.id),
          eq(activityPeople.personId, input.personId),
        ),
      )
      .returning();
    if (removed.length) {
      await recordAudit(tx, actor, {
        accountability: "member",
        action: "activity.person.remove",
        targetType: "activity",
        targetId: activity.id,
        details: { projectId: activity.projectId, personId: input.personId },
      });
    }
    return { removed: removed.length > 0 };
  });
}

export async function listActivityParticipants(actor: Principal, activityId: string) {
  const activity = await requireActivity(actor, activityId, "read");
  return db
    .select({
      personId: persons.id,
      displayName: persons.displayName,
      summary: persons.summary,
      roleLabel: activityPeople.roleLabel,
    })
    .from(activityPeople)
    .innerJoin(persons, eq(persons.id, activityPeople.personId))
    .where(eq(activityPeople.activityId, activity.id))
    .orderBy(asc(persons.displayName), asc(persons.id));
}

export async function addActivityMaterial(
  actor: Principal,
  input: { activityId: string; sourceId: string },
) {
  const activity = await requireActivity(actor, input.activityId, "write");
  const [source] = await db
    .select({ id: sources.id })
    .from(sources)
    .innerJoin(projects, eq(projects.projectId, sources.spaceId))
    .where(and(eq(sources.id, input.sourceId), eq(sources.spaceId, activity.projectId)));
  if (!source) throw new ApiError(400, "invalid_activity_material", "Invalid Project Material.");
  return addRelation(actor, activity, "material", source.id, async (tx) =>
    tx
      .insert(activityMaterials)
      .values({
        activityId: activity.id,
        projectId: activity.projectId,
        sourceId: source.id,
        createdBy: actor.userId,
      })
      .onConflictDoNothing()
      .returning(),
  );
}

export async function removeActivityMaterial(
  actor: Principal,
  input: { activityId: string; sourceId: string },
) {
  const activity = await requireActivity(actor, input.activityId, "write");
  return removeRelation(actor, activity, "material", input.sourceId, (tx) =>
    tx
      .delete(activityMaterials)
      .where(
        and(
          eq(activityMaterials.activityId, activity.id),
          eq(activityMaterials.sourceId, input.sourceId),
        ),
      )
      .returning(),
  );
}

export async function listActivityMaterials(actor: Principal, activityId: string) {
  const activity = await requireActivity(actor, activityId, "read");
  return db
    .select({
      sourceId: sources.id,
      title: sources.title,
      description: sources.description,
      trustStatus: sources.trustStatus,
    })
    .from(activityMaterials)
    .innerJoin(sources, eq(sources.id, activityMaterials.sourceId))
    .where(eq(activityMaterials.activityId, activity.id))
    .orderBy(asc(sources.title), asc(sources.id));
}

export async function addActivityNote(
  actor: Principal,
  input: { activityId: string; nodeId: string },
) {
  const activity = await requireActivity(actor, input.activityId, "write");
  const [node] = await db
    .select({ id: treeNodes.id })
    .from(treeNodes)
    .innerJoin(projects, eq(projects.projectId, treeNodes.projectId))
    .where(and(eq(treeNodes.id, input.nodeId), eq(treeNodes.projectId, activity.projectId)));
  if (!node) throw new ApiError(400, "invalid_activity_note", "Invalid Project Note.");
  return addRelation(actor, activity, "note", node.id, async (tx) =>
    tx
      .insert(activityNotes)
      .values({
        activityId: activity.id,
        projectId: activity.projectId,
        nodeId: node.id,
        createdBy: actor.userId,
      })
      .onConflictDoNothing()
      .returning(),
  );
}

export async function removeActivityNote(
  actor: Principal,
  input: { activityId: string; nodeId: string },
) {
  const activity = await requireActivity(actor, input.activityId, "write");
  return removeRelation(actor, activity, "note", input.nodeId, (tx) =>
    tx
      .delete(activityNotes)
      .where(and(eq(activityNotes.activityId, activity.id), eq(activityNotes.nodeId, input.nodeId)))
      .returning(),
  );
}

export async function listActivityNotes(actor: Principal, activityId: string) {
  const activity = await requireActivity(actor, activityId, "read");
  return db
    .select({
      nodeId: treeNodes.id,
      title: treeNodes.title,
      summary: treeNodes.summary,
      researchPurpose: treeNodes.researchPurpose,
      verification: treeNodes.verification,
    })
    .from(activityNotes)
    .innerJoin(treeNodes, eq(treeNodes.id, activityNotes.nodeId))
    .where(eq(activityNotes.activityId, activity.id))
    .orderBy(asc(treeNodes.title), asc(treeNodes.id));
}

export async function listActivityTasks(actor: Principal, activityId: string) {
  const activity = await requireActivity(actor, activityId, "read");
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.activityId, activity.id))
    .orderBy(desc(tasks.updatedAt));
}

type ActivityRow = typeof activities.$inferSelect;
type RelationKind = "material" | "note";

async function addRelation(
  actor: Principal,
  activity: ActivityRow,
  kind: RelationKind,
  relatedId: string,
  insert: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<unknown[]>,
) {
  return db.transaction(async (tx) => {
    const created = await insert(tx);
    if (created.length) {
      await recordAudit(tx, actor, {
        accountability: "member",
        action: `activity.${kind}.add`,
        targetType: "activity",
        targetId: activity.id,
        details: { projectId: activity.projectId, [`${kind}Id`]: relatedId },
      });
    }
    return { created: created.length > 0 };
  });
}

async function removeRelation(
  actor: Principal,
  activity: ActivityRow,
  kind: RelationKind,
  relatedId: string,
  remove: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<unknown[]>,
) {
  return db.transaction(async (tx) => {
    const removed = await remove(tx);
    if (removed.length) {
      await recordAudit(tx, actor, {
        accountability: "member",
        action: `activity.${kind}.remove`,
        targetType: "activity",
        targetId: activity.id,
        details: { projectId: activity.projectId, [`${kind}Id`]: relatedId },
      });
    }
    return { removed: removed.length > 0 };
  });
}
