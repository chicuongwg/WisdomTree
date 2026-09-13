import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError, forbidden, notFound, versionConflict } from "@/lib/errors";
import { recordAudit } from "../audit/service";
import { authorize } from "../auth/authorize";
import {
  hasTmktCoreCapability,
  requireProjectResearchRead,
  researchReadableProjectIds,
} from "../auth/core";
import type { Principal } from "../auth/principal";
import { users } from "../auth/schema";
import { createTeamSpaceInTransaction } from "../storage/service";
import { spaceMembers, spaces } from "../storage/schema";
import { hasProjectCapability, hasProjectLibraryOperator } from "./capabilities";
import {
  projectCapabilities,
  projectLibraryOperators,
  projects,
  type ProjectStatus,
} from "./schema";

const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "completed", "archived"];

function requiredText(value: string | undefined, code: string, message: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new ApiError(400, code, message);
  return normalized;
}

function optionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

const projectSelection = {
  id: projects.projectId,
  name: spaces.name,
  researchLens: projects.researchLens,
  description: projects.description,
  status: projects.status,
  createdBy: projects.createdBy,
  personalOwnerId: projects.personalOwnerId,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
  version: projects.version,
};

const PERSONAL_PROJECT_NAME = "My Project";
const PERSONAL_PROJECT_LENS = "Personal research workspace";

/** Create the team-space identity, manager membership and Project atomically. */
export async function createProject(
  actor: Principal,
  input: { name?: string; researchLens?: string; description?: string },
) {
  authorize(actor, "storage.space.manage", { kind: "write" });
  const name = requiredText(input.name, "invalid_project", "Project name must not be empty.");
  const researchLens = requiredText(
    input.researchLens,
    "invalid_project",
    "Project research lens must not be empty.",
  );
  const description = optionalText(input.description) ?? null;

  return db.transaction(async (tx) => {
    const space = await createTeamSpaceInTransaction(tx, actor, name);
    const [project] = await tx
      .insert(projects)
      .values({
        projectId: space.id,
        researchLens,
        description,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "project.create",
      targetType: "project",
      targetId: project.projectId,
      details: { spaceId: space.id, status: project.status },
    });
    const { projectId, ...metadata } = project;
    return { id: projectId, name: space.name, ...metadata };
  });
}

/**
 * Idempotently ensure one normal Project over an active User's Personal
 * Space. The advisory lock makes concurrent account lifecycle calls converge
 * on one Project without creating a second Personal Space.
 */
export async function ensurePersonalProject(userId: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
    const [existing] = await tx
      .select(projectSelection)
      .from(projects)
      .innerJoin(spaces, eq(projects.projectId, spaces.id))
      .where(eq(projects.personalOwnerId, userId));
    if (existing) return existing;

    const [owner] = await tx
      .select({ id: users.id, role: users.role, disabledAt: users.disabledAt })
      .from(users)
      .where(eq(users.id, userId));
    if (!owner || owner.disabledAt) throw notFound();
    const ownerActor: Principal = {
      userId: owner.id,
      role: owner.role,
      spaceIds: [],
      spaceMemberships: [],
    };
    const [space] = await tx
      .insert(spaces)
      .values({
        name: PERSONAL_PROJECT_NAME,
        type: "personal",
        ownerUserId: owner.id,
        createdBy: owner.id,
      })
      .returning({ id: spaces.id, name: spaces.name });
    await tx.insert(spaceMembers).values({
      spaceId: space.id,
      userId: owner.id,
      memberRole: "manager",
      addedBy: owner.id,
    });
    const [project] = await tx
      .insert(projects)
      .values({
        projectId: space.id,
        researchLens: PERSONAL_PROJECT_LENS,
        createdBy: owner.id,
        personalOwnerId: owner.id,
      })
      .returning();
    await recordAudit(tx, ownerActor, {
      accountability: "member",
      action: "project.personal.provision",
      targetType: "project",
      targetId: project.projectId,
      details: { ownerUserId: owner.id },
    });
    return {
      id: project.projectId,
      name: space.name,
      researchLens: project.researchLens,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy,
      personalOwnerId: project.personalOwnerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      version: project.version,
    };
  });
}

/** Confirm one existing managed team space as a Project without moving its data. */
export async function registerExistingTeamSpaceAsProject(
  actor: Principal,
  input: {
    spaceId: string;
    researchLens?: string;
    description?: string | null;
    status?: string;
  },
) {
  const researchLens = requiredText(
    input.researchLens,
    "invalid_project",
    "Project research lens must not be empty.",
  );
  const description = optionalText(input.description) ?? null;
  if (!input.status || !PROJECT_STATUSES.includes(input.status as ProjectStatus)) {
    throw new ApiError(400, "invalid_project_status", "Invalid Project status.");
  }

  return db.transaction(async (tx) => {
    const [space] = await tx
      .select({ id: spaces.id, name: spaces.name, type: spaces.type })
      .from(spaces)
      .where(eq(spaces.id, input.spaceId))
      .for("update");
    if (!space) throw notFound();
    authorize(actor, "storage.space.members.manage", { spaceId: space.id, kind: "write" });
    if (space.type !== "team") {
      throw new ApiError(400, "invalid_project_space", "Only a Team Space can be a Project.");
    }

    const [existing] = await tx
      .select({ id: projects.projectId })
      .from(projects)
      .where(eq(projects.projectId, space.id));
    if (existing) {
      throw new ApiError(409, "project_exists", "This Team Space is already a Project.");
    }

    const [project] = await tx
      .insert(projects)
      .values({
        projectId: space.id,
        researchLens,
        description,
        status: input.status as ProjectStatus,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "project.register",
      targetType: "project",
      targetId: project.projectId,
      details: { spaceId: space.id, status: project.status },
    });
    const { projectId, ...metadata } = project;
    return { id: projectId, name: space.name, ...metadata };
  });
}

/** One confirmed Project; a legacy team space is deliberately not a Project. */
export async function getProject(actor: Principal, projectId: string) {
  const [project] = await db
    .select(projectSelection)
    .from(projects)
    .innerJoin(spaces, eq(projects.projectId, spaces.id))
    .where(eq(projects.projectId, projectId));
  if (!project) throw notFound();
  await requireProjectResearchRead(actor, project.id);
  return project;
}

/** Confirmed Projects visible by membership or explicit TMKT research-read. */
export async function listProjects(actor: Principal) {
  const visible = await researchReadableProjectIds(actor);
  if (visible.length === 0) return [];
  return db
    .select(projectSelection)
    .from(projects)
    .innerJoin(spaces, eq(projects.projectId, spaces.id))
    .where(inArray(projects.projectId, visible))
    .orderBy(asc(spaces.name));
}

/** Durable server-computed UI eligibility; never a replacement for mutation authorization. */
export async function getProjectApplicationAccess(actor: Principal, projectId: string) {
  await requireProjectResearchRead(actor, projectId);
  const [membership] = await db
    .select({ role: spaceMembers.memberRole })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.spaceId, projectId), eq(spaceMembers.userId, actor.userId)));
  const [libraryCirculation, libraryOperator, canPublish] = await Promise.all([
    hasProjectCapability(projectId, "library_circulation"),
    hasProjectLibraryOperator(actor, projectId),
    hasTmktCoreCapability(actor, "tmkt.publish"),
  ]);
  return projectApplicationAccess(
    membership?.role,
    libraryCirculation,
    libraryOperator,
    canPublish,
  );
}

function projectApplicationAccess(
  membershipRole: "viewer" | "contributor" | "manager" | undefined,
  libraryCirculation: boolean,
  libraryOperator: boolean,
  canPublish: boolean,
) {
  const operationalMember = Boolean(membershipRole);
  const contributor = membershipRole === "contributor" || membershipRole === "manager";
  const manager = membershipRole === "manager";
  return {
    researchReadable: true,
    operationalMember,
    features: { libraryCirculation },
    capabilities: {
      canEditProject: manager,
      canCreateNote: contributor,
      canCreateMaterial: contributor,
      canCreateActivity: contributor,
      canCreateTask: contributor,
      canManagePeople: contributor,
      canPublish,
      canManageLibraryOperators: manager && libraryCirculation,
      isLibraryOperator: operationalMember && libraryCirculation && libraryOperator,
    },
  };
}

/** Batch access facts for an already research-authorized Project list. */
export async function listProjectApplicationAccess(actor: Principal, projectIds: string[]) {
  if (!projectIds.length) return new Map<string, ReturnType<typeof projectApplicationAccess>>();
  const [memberships, capabilities, operators, canPublish] = await Promise.all([
    db
      .select({ projectId: spaceMembers.spaceId, role: spaceMembers.memberRole })
      .from(spaceMembers)
      .where(and(eq(spaceMembers.userId, actor.userId), inArray(spaceMembers.spaceId, projectIds))),
    db
      .select({ projectId: projectCapabilities.projectId })
      .from(projectCapabilities)
      .where(
        and(
          inArray(projectCapabilities.projectId, projectIds),
          eq(projectCapabilities.capability, "library_circulation"),
        ),
      ),
    db
      .select({ projectId: projectLibraryOperators.projectId })
      .from(projectLibraryOperators)
      .where(
        and(
          eq(projectLibraryOperators.userId, actor.userId),
          inArray(projectLibraryOperators.projectId, projectIds),
        ),
      ),
    hasTmktCoreCapability(actor, "tmkt.publish"),
  ]);
  const membershipByProject = new Map(memberships.map((row) => [row.projectId, row.role]));
  const libraryProjects = new Set(capabilities.map((row) => row.projectId));
  const operatorProjects = new Set(operators.map((row) => row.projectId));
  return new Map(
    projectIds.map((projectId) => [
      projectId,
      projectApplicationAccess(
        membershipByProject.get(projectId),
        libraryProjects.has(projectId),
        operatorProjects.has(projectId),
        canPublish,
      ),
    ]),
  );
}

export async function updateProject(
  actor: Principal,
  projectId: string,
  input: {
    researchLens?: string;
    description?: string | null;
    status?: string;
    expectedVersion?: number;
  },
) {
  const [existing] = await db
    .select(projectSelection)
    .from(projects)
    .innerJoin(spaces, eq(projects.projectId, spaces.id))
    .where(eq(projects.projectId, projectId));
  if (!existing) throw notFound();
  authorize(actor, "storage.space.members.manage", { spaceId: existing.id, kind: "write" });

  const expectedVersion = input.expectedVersion;
  if (typeof expectedVersion !== "number") throw versionConflict();
  const researchLens =
    input.researchLens === undefined
      ? undefined
      : requiredText(
          input.researchLens,
          "invalid_project",
          "Project research lens must not be empty.",
        );
  const description = optionalText(input.description);
  if (input.status !== undefined && !PROJECT_STATUSES.includes(input.status as ProjectStatus)) {
    throw new ApiError(400, "invalid_project_status", "Invalid Project status.");
  }
  if (researchLens === undefined && description === undefined && input.status === undefined) {
    throw new ApiError(400, "invalid_project", "No Project metadata changes were provided.");
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(projects)
      .set({
        ...(researchLens !== undefined ? { researchLens } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(input.status !== undefined ? { status: input.status as ProjectStatus } : {}),
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(projects.projectId, projectId), eq(projects.version, expectedVersion)))
      .returning();
    if (!updated) throw versionConflict();

    const changed: Record<string, unknown> = {};
    if (researchLens !== undefined) changed.researchLens = "edited";
    if (description !== undefined) changed.description = "edited";
    if (input.status !== undefined) changed.status = { from: existing.status, to: updated.status };
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "project.update",
      targetType: "project",
      targetId: projectId,
      details: changed,
    });
    const { projectId: id, ...metadata } = updated;
    return { id, name: existing.name, ...metadata };
  });
}

/** Personal Projects are private single-owner workspaces, not member rosters. */
export async function requireSharedProjectMembershipManagement(
  actor: Principal,
  projectId: string,
) {
  const project = await getProject(actor, projectId);
  if (project.personalOwnerId) throw forbidden();
  return project;
}
