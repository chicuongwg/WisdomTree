import { forbidden, notFound, unauthorized } from "@/lib/errors";
import type { Principal } from "./principal";
import type { Role } from "./schema";

// The single authorize(actor, permission, resource) helper — route handlers
// never hand-roll checks. Roles carry the whole vertical axis (the old
// per-user capability table collapsed into them); the scope qualifier is the
// horizontal axis and does the real per-record work.
//
// Role model: user (thành viên), editor (biên tập), admin_op (quản trị).

type Scope = "global" | "space" | "self" | "owned-or-assigned";
type SpaceRole = "viewer" | "contributor" | "manager";

const SPACE_ROLE_RANK: Record<SpaceRole, number> = { viewer: 0, contributor: 1, manager: 2 };

const EVERYONE: Role[] = ["user", "editor", "admin_op"];
const REVIEWERS: Role[] = ["editor", "admin_op"];
const ADMIN: Role[] = ["admin_op"];

const CATALOG: Record<string, { roles: Role[]; scope: Scope; spaceRole?: SpaceRole }> = {
  // --- Storage (Library) ---
  "storage.library.browse": { roles: EVERYONE, scope: "space", spaceRole: "viewer" },
  "storage.upload": { roles: EVERYONE, scope: "space", spaceRole: "contributor" },
  "storage.submissions.read": { roles: EVERYONE, scope: "self" },
  "storage.download": { roles: EVERYONE, scope: "space", spaceRole: "viewer" },
  // Correcting your own upload: rename it, or withdraw it before anyone has
  // built on it. Owned-or-assigned so a submitter can fix their own mistake
  // without an admin.
  "storage.source.manage": { roles: EVERYONE, scope: "owned-or-assigned" },
  // The admin-only archive/restore view of withdrawn items.
  "storage.source.read_all": { roles: ADMIN, scope: "global" },
  "storage.space.manage": { roles: ADMIN, scope: "global" },
  "storage.space.members.manage": { roles: EVERYONE, scope: "space", spaceRole: "manager" },
  // Physical books in the Library and their loans.
  "library.physical.manage": { roles: ADMIN, scope: "global" },
  "circulation.loan.request": { roles: EVERYONE, scope: "space", spaceRole: "viewer" },
  "circulation.loan.manage": { roles: ADMIN, scope: "global" },
  // --- Knowledge ---
  "knowledge.node.read": { roles: EVERYONE, scope: "global" },
  "knowledge.space.read": { roles: EVERYONE, scope: "space", spaceRole: "viewer" },
  "knowledge.search": { roles: EVERYONE, scope: "global" },
  "knowledge.graph.read": { roles: EVERYONE, scope: "global" },
  // Growing your own personal tree: the gate is ownership, not a global
  // role — the service passes the personal branch's owner ids. Team-branch
  // content never enters here; it goes through the proposal pipeline
  // (submission_required).
  "knowledge.branch.create": { roles: EVERYONE, scope: "owned-or-assigned" },
  "knowledge.branch.edit": { roles: EVERYONE, scope: "owned-or-assigned" },
  "knowledge.branch.manage": { roles: EVERYONE, scope: "space", spaceRole: "manager" },
  "knowledge.submit": { roles: EVERYONE, scope: "space", spaceRole: "contributor" },
  "knowledge.node.create": { roles: EVERYONE, scope: "owned-or-assigned" },
  "knowledge.node.edit": {
    roles: ["editor", "admin_op"],
    scope: "space",
    spaceRole: "contributor",
  },
  // The single review boundary: promotion decisions and verification levers.
  "knowledge.publish": { roles: REVIEWERS, scope: "space", spaceRole: "contributor" },
  "knowledge.review.list": { roles: REVIEWERS, scope: "global" },
  "knowledge.node.merge": { roles: REVIEWERS, scope: "space", spaceRole: "contributor" },
  "knowledge.archive": { roles: REVIEWERS, scope: "space", spaceRole: "contributor" },
  // --- Export ---
  "export.tree.trigger": { roles: ADMIN, scope: "global" },
  "export.space.release": { roles: EVERYONE, scope: "space", spaceRole: "manager" },
  // --- Admin console ---
  "admin.health.read": { roles: ADMIN, scope: "global" },
  "admin.users.manage": { roles: ADMIN, scope: "global" },
  "admin.audit.read": { roles: ADMIN, scope: "global" },
  // --- Notify + PM ---
  // notify.comment.create's scope is "anchor (delegates to the anchor's read
  // permission)": the role gate lives here; the anchor-scope delegation is
  // resolveAnchor() in notify/service.ts (404 on non-visible anchors).
  "notify.comment.create": { roles: EVERYONE, scope: "global" },
  "notify.preferences.manage": { roles: EVERYONE, scope: "self" },
  "pm.deadline.read": { roles: EVERYONE, scope: "space", spaceRole: "viewer" },
  "pm.deadline.edit": { roles: EVERYONE, scope: "space", spaceRole: "contributor" },
  // pm.board.manage: owned-or-assigned task updates for every member. The
  // guild-board model (owner decision 2026-07-21): whoever holds a task works
  // it, whatever their role.
  "pm.board.manage": { roles: EVERYONE, scope: "owned-or-assigned" },
  // Every approved member sees the team's workload.
  "pm.board.read": { roles: EVERYONE, scope: "global" },
  // Taking an unassigned task from the pool; the service additionally
  // requires assigned_to IS NULL, so this can never reassign someone's work.
  "pm.task.claim": { roles: EVERYONE, scope: "global" },
  "pm.task.archive": { roles: EVERYONE, scope: "owned-or-assigned" },
};

export type PermissionKey = keyof typeof CATALOG;

export type ResourceRef = {
  /** For space scope: the resource's space_id. */
  spaceId?: string;
  /** For self scope: the record's owning user id. */
  userId?: string;
  /**
   * For owned-or-assigned scope: created_by / submitted_by plus any active
   * assignment (enforcement pipeline step 3).
   */
  ownerIds?: Array<string | null | undefined>;
  /** Reads throw 404 on scope failure (no existence leak); writes throw 403. */
  kind: "read" | "write";
};

export function authorize(
  actor: Principal | null,
  permission: PermissionKey,
  resource: ResourceRef,
): Principal {
  if (!actor) throw unauthorized();
  const entry = CATALOG[permission];
  const denial = resource.kind === "read" ? notFound() : forbidden();

  if (!entry.roles.includes(actor.role)) throw denial;

  switch (entry.scope) {
    case "global":
      return actor;
    case "space": {
      // Admin/Op is the break-glass operator across knowledge spaces. Other
      // modules retain their existing explicit-membership boundary.
      if (
        actor.role === "admin_op" &&
        (permission.startsWith("knowledge.") || permission === "export.space.release")
      )
        return actor;
      if (!resource.spaceId) throw denial;
      const membership = actor.spaceMemberships.find((item) => item.spaceId === resource.spaceId);
      if (!membership) throw denial;
      if (entry.spaceRole && SPACE_ROLE_RANK[membership.role] < SPACE_ROLE_RANK[entry.spaceRole])
        throw denial;
      return actor;
    }
    case "self":
      if (resource.userId !== actor.userId) throw denial;
      return actor;
    case "owned-or-assigned":
      if (!resource.ownerIds?.includes(actor.userId)) throw denial;
      return actor;
  }
}

/**
 * The one query-layer scoping helper (no per-endpoint ad hoc filtering):
 * returns the space ids a list query may see.
 */
export function scopedToSpaces(actor: Principal): string[] | null {
  return actor.role === "admin_op" ? null : actor.spaceIds;
}
