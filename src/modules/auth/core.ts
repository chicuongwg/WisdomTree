import { and, asc, eq, isNull } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { notFound } from "@/lib/errors";
import { recordAudit } from "../audit/service";
import { projects } from "../project/schema";
import { spaceMembers } from "../storage/schema";
import { authorize } from "./authorize";
import type { Principal } from "./principal";
import { tmktCoreMembers, users } from "./schema";

type Runner = Tx | typeof db;

export const TMKT_CORE_CAPABILITIES = [
  "tmkt.research.read_all",
  "tmkt.research.curate",
  "tmkt.publish",
] as const;

export type TmktCoreCapability = (typeof TMKT_CORE_CAPABILITIES)[number];

/** Core is checked from durable membership on every use, never cached on Principal. */
export async function hasTmktCoreCapability(
  actor: Principal,
  _capability: TmktCoreCapability,
  runner: Runner = db,
) {
  const [membership] = await runner
    .select({ userId: tmktCoreMembers.userId })
    .from(tmktCoreMembers)
    .where(eq(tmktCoreMembers.userId, actor.userId));
  return Boolean(membership);
}

/** Confirmed Project research is readable by a Project member or explicit Core. */
export async function requireProjectResearchRead(
  actor: Principal,
  projectId: string,
  runner: Runner = db,
) {
  const [project] = await runner
    .select({ projectId: projects.projectId })
    .from(projects)
    .where(eq(projects.projectId, projectId));
  if (!project) throw notFound();
  const [membership] = await runner
    .select({ userId: spaceMembers.userId })
    .from(spaceMembers)
    .where(and(eq(spaceMembers.spaceId, project.projectId), eq(spaceMembers.userId, actor.userId)));
  if (membership) return project;
  if (await hasTmktCoreCapability(actor, "tmkt.research.read_all", runner)) return project;
  throw notFound();
}

/** Confirmed Project ids visible through research-read semantics. */
export async function researchReadableProjectIds(actor: Principal, runner: Runner = db) {
  if (await hasTmktCoreCapability(actor, "tmkt.research.read_all", runner)) {
    return runner
      .select({ projectId: projects.projectId })
      .from(projects)
      .orderBy(asc(projects.projectId))
      .then((rows) => rows.map((row) => row.projectId));
  }
  return runner
    .select({ projectId: projects.projectId })
    .from(projects)
    .innerJoin(
      spaceMembers,
      and(eq(spaceMembers.spaceId, projects.projectId), eq(spaceMembers.userId, actor.userId)),
    )
    .orderBy(asc(projects.projectId))
    .then((rows) => rows.map((row) => row.projectId));
}

export async function grantTmktCore(actor: Principal, userId: string) {
  authorize(actor, "admin.tmkt_core.manage", { kind: "write" });
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));
  if (!target) throw notFound();
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(tmktCoreMembers)
      .values({ userId: target.id, grantedBy: actor.userId })
      .onConflictDoNothing()
      .returning();
    if (created) {
      await recordAudit(tx, actor, {
        accountability: "operator",
        action: "tmkt.core.grant",
        targetType: "user",
        targetId: target.id,
        details: { userId: target.id, actorId: actor.userId },
      });
    }
    return { userId: target.id, granted: Boolean(created) };
  });
}

export async function revokeTmktCore(actor: Principal, userId: string) {
  authorize(actor, "admin.tmkt_core.manage", { kind: "write" });
  return db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(tmktCoreMembers)
      .where(eq(tmktCoreMembers.userId, userId))
      .returning();
    if (removed) {
      await recordAudit(tx, actor, {
        accountability: "operator",
        action: "tmkt.core.revoke",
        targetType: "user",
        targetId: userId,
        details: { userId, actorId: actor.userId },
      });
    }
    return { userId, revoked: Boolean(removed) };
  });
}

export async function listTmktCoreMembers(actor: Principal) {
  authorize(actor, "admin.tmkt_core.manage", { kind: "read" });
  return db
    .select({
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      grantedBy: tmktCoreMembers.grantedBy,
      createdAt: tmktCoreMembers.createdAt,
    })
    .from(tmktCoreMembers)
    .innerJoin(users, eq(users.id, tmktCoreMembers.userId))
    .orderBy(asc(users.displayName), asc(users.id));
}
