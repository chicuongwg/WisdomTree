import { and, asc, eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, forbidden, notFound } from "@/lib/errors";
import { recordAudit } from "../audit/service";
import { authorize } from "../auth/authorize";
import { requireProjectResearchRead } from "../auth/core";
import type { Principal } from "../auth/principal";
import { spaceMembers } from "../storage/schema";
import { users } from "../auth/schema";
import {
  projectCapabilities,
  projectLibraryOperators,
  projects,
  type ProjectCapability,
} from "./schema";

type Runner = Tx | typeof db;

const CAPABILITIES: ProjectCapability[] = ["library_circulation"];

function assertCapability(value: string): asserts value is ProjectCapability {
  if (!CAPABILITIES.includes(value as ProjectCapability)) {
    throw new ApiError(400, "invalid_project_capability", "Unsupported Project capability.");
  }
}

async function requireConfirmedProject(projectId: string, runner: Runner = db) {
  const [project] = await runner
    .select({ projectId: projects.projectId })
    .from(projects)
    .where(eq(projects.projectId, projectId));
  if (!project) throw notFound();
  return project;
}

export async function hasProjectCapability(
  projectId: string,
  capability: ProjectCapability,
  runner: Runner = db,
) {
  const [row] = await runner
    .select({ projectId: projectCapabilities.projectId })
    .from(projectCapabilities)
    .where(
      and(
        eq(projectCapabilities.projectId, projectId),
        eq(projectCapabilities.capability, capability),
      ),
    );
  return Boolean(row);
}

export async function requireProjectCapability(
  projectId: string,
  capability: ProjectCapability,
  runner: Runner = db,
) {
  await requireConfirmedProject(projectId, runner);
  if (!(await hasProjectCapability(projectId, capability, runner))) {
    throw new ApiError(
      409,
      "project_capability_required",
      `Project capability ${capability} is required.`,
    );
  }
}

export async function enableProjectCapability(
  actor: Principal,
  input: { projectId: string; capability: string },
) {
  authorize(actor, "storage.space.manage", { kind: "write" });
  assertCapability(input.capability);
  const capability = input.capability;
  await requireConfirmedProject(input.projectId);
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projectCapabilities)
      .values({
        projectId: input.projectId,
        capability,
        createdBy: actor.userId,
      })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await recordAudit(tx, actor, {
        accountability: "operator",
        action: "project.capability.enable",
        targetType: "project",
        targetId: input.projectId,
        details: { projectId: input.projectId, capability },
      });
    }
    return { capability, enabled: Boolean(created) };
  });
}

export async function disableProjectCapability(
  actor: Principal,
  input: { projectId: string; capability: string },
) {
  authorize(actor, "storage.space.manage", { kind: "write" });
  assertCapability(input.capability);
  const capability = input.capability;
  await requireConfirmedProject(input.projectId);
  return db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(projectCapabilities)
      .where(
        and(
          eq(projectCapabilities.projectId, input.projectId),
          eq(projectCapabilities.capability, capability),
        ),
      )
      .returning();
    if (removed) {
      await recordAudit(tx, actor, {
        accountability: "operator",
        action: "project.capability.disable",
        targetType: "project",
        targetId: input.projectId,
        details: { projectId: input.projectId, capability },
      });
    }
    return { capability, disabled: Boolean(removed) };
  });
}

export async function listProjectCapabilities(actor: Principal, projectId: string) {
  await requireConfirmedProject(projectId);
  await requireProjectResearchRead(actor, projectId);
  return db
    .select({ capability: projectCapabilities.capability })
    .from(projectCapabilities)
    .where(eq(projectCapabilities.projectId, projectId))
    .orderBy(asc(projectCapabilities.capability));
}

export async function hasProjectLibraryOperator(
  actor: Principal,
  projectId: string,
  runner: Runner = db,
) {
  const [operator] = await runner
    .select({ userId: projectLibraryOperators.userId })
    .from(projectLibraryOperators)
    .innerJoin(
      spaceMembers,
      and(
        eq(spaceMembers.spaceId, projectLibraryOperators.projectId),
        eq(spaceMembers.userId, projectLibraryOperators.userId),
      ),
    )
    .where(
      and(
        eq(projectLibraryOperators.projectId, projectId),
        eq(projectLibraryOperators.userId, actor.userId),
      ),
    );
  return Boolean(operator);
}

export async function grantProjectLibraryOperator(
  actor: Principal,
  input: { projectId: string; userId: string },
) {
  await requireProjectCapability(input.projectId, "library_circulation");
  authorize(actor, "storage.space.members.manage", {
    spaceId: input.projectId,
    kind: "write",
  });
  const [membership] = await db
    .select({ userId: spaceMembers.userId })
    .from(spaceMembers)
    .where(
      and(eq(spaceMembers.spaceId, input.projectId), eq(spaceMembers.userId, input.userId)),
    );
  if (!membership) throw notFound();
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projectLibraryOperators)
      .values({ projectId: input.projectId, userId: input.userId, grantedBy: actor.userId })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await recordAudit(tx, actor, {
        accountability: "operator",
        action: "project.library_operator.grant",
        targetType: "project",
        targetId: input.projectId,
        details: { projectId: input.projectId, userId: input.userId },
      });
    }
    return { userId: input.userId, granted: Boolean(created) };
  });
}

export async function revokeProjectLibraryOperator(
  actor: Principal,
  input: { projectId: string; userId: string },
) {
  await requireConfirmedProject(input.projectId);
  authorize(actor, "storage.space.members.manage", {
    spaceId: input.projectId,
    kind: "write",
  });
  return db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(projectLibraryOperators)
      .where(
        and(
          eq(projectLibraryOperators.projectId, input.projectId),
          eq(projectLibraryOperators.userId, input.userId),
        ),
      )
      .returning();
    if (removed) {
      await recordAudit(tx, actor, {
        accountability: "operator",
        action: "project.library_operator.revoke",
        targetType: "project",
        targetId: input.projectId,
        details: { projectId: input.projectId, userId: input.userId },
      });
    }
    return { userId: input.userId, revoked: Boolean(removed) };
  });
}

export async function listProjectLibraryOperators(actor: Principal, projectId: string) {
  await requireConfirmedProject(projectId);
  authorize(actor, "storage.space.members.manage", { spaceId: projectId, kind: "read" });
  return db
    .select({
      userId: users.id,
      displayName: users.displayName,
      grantedBy: projectLibraryOperators.grantedBy,
      createdAt: projectLibraryOperators.createdAt,
    })
    .from(projectLibraryOperators)
    .innerJoin(users, eq(users.id, projectLibraryOperators.userId))
    .where(eq(projectLibraryOperators.projectId, projectId))
    .orderBy(asc(users.displayName), asc(users.id));
}

export async function requireProjectLibraryOperator(
  actor: Principal,
  projectId: string,
  runner: Runner = db,
) {
  await requireProjectCapability(projectId, "library_circulation", runner);
  if (!(await hasProjectLibraryOperator(actor, projectId, runner))) throw forbidden();
  return { userId: actor.userId };
}
