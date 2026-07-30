import { forbidden, notFound, unauthorized } from "@/lib/errors";
import type { Principal } from "./dev-auth";
import type { Role } from "./schema";

// The single authorize(actor, permission, resource) helper required by
// docs/design/authorization-design.md — route handlers never hand-roll
// checks. This is the demo subset of the permission catalog; keys and scope
// qualifiers are verbatim from the catalog table.

type Scope = "global" | "space" | "self" | "owned-or-assigned";
type SpaceRole = "viewer" | "contributor" | "manager";

const CATALOG: Record<string, { roles: Role[]; scope: Scope; spaceRole?: SpaceRole }> = {
  "storage.intake.open": { roles: ["user"], scope: "global" },
  "storage.library.browse": { roles: ["user", "editor", "admin_op"], scope: "space", spaceRole: "viewer" },
  "storage.upload": { roles: ["user"], scope: "space", spaceRole: "contributor" },
  "storage.submissions.read": { roles: ["user", "editor", "admin_op"], scope: "self" },
  "storage.download": { roles: ["user", "editor", "admin_op"], scope: "space", spaceRole: "viewer" },
  "storage.search": { roles: ["user", "editor", "admin_op"], scope: "space", spaceRole: "viewer" },
  "catalog.browse": { roles: ["user", "editor", "admin_op"], scope: "space", spaceRole: "viewer" },
  "circulation.loan.request": { roles: ["user", "editor", "admin_op"], scope: "space", spaceRole: "viewer" },
  "circulation.loan.manage": { roles: ["admin_op"], scope: "global" },
  "catalog.item.manage": { roles: ["admin_op"], scope: "global" },
  "storage.space.manage": { roles: ["admin_op"], scope: "global" },
  "storage.space.members.manage": {
    roles: ["user", "editor", "admin_op"],
    scope: "space",
    spaceRole: "manager",
  },
  // --- Knowledge module (authorization-design.md § Permission Catalog) ---
  "knowledge.node.read": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "knowledge.search": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "knowledge.branch.create": { roles: [], scope: "global" },
  "knowledge.branch.edit": { roles: ["editor"], scope: "owned-or-assigned" },
  "knowledge.node.create": { roles: [], scope: "global" },
  "knowledge.node.edit": { roles: ["editor"], scope: "owned-or-assigned" },
  "knowledge.publish": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "knowledge.node.merge": { roles: ["editor"], scope: "global" },
  "knowledge.archive": { roles: ["editor"], scope: "global" },
  "storage.corrected.edit": { roles: ["editor"], scope: "owned-or-assigned" },
  "storage.draft.edit": { roles: ["editor"], scope: "owned-or-assigned" },
  "review.corrected.approve": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "review.draft.approve": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "storage.source.read_all": { roles: ["user", "editor", "admin_op"], scope: "global" },
  // Correcting your own upload: rename it, or withdraw it before anyone has
  // built on it. Owned-or-assigned so a submitter can fix their own mistake
  // without an admin, which is the difference between this and a spreadsheet.
  "storage.source.manage": { roles: ["user", "editor", "admin_op"], scope: "owned-or-assigned" },
  // Not in the catalog table verbatim: curation assignment and gap triage are
  // Admin/Op flows (sequence-diagrams.md Flow 2, admin-op-flows.md); keyed
  // here as module.action pending a catalog addendum — flagged in the report.
  "storage.curation.assign": { roles: ["editor"], scope: "global" },
  "storage.gap.triage": { roles: ["editor"], scope: "global" },
  // --- Export module (authorization-design.md § Permission Catalog) ---
  "export.document": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "export.tree.trigger": { roles: ["admin_op"], scope: "global" },
  // Not in the catalog table verbatim: the Admin/Op health surface (openapi
  // GET /admin/health "Admin/Op") — keyed pending a catalog addendum like
  // storage.curation.assign; flagged in the report.
  "admin.health.read": { roles: ["admin_op"], scope: "global" },
  // Catalog addendum rows (authorization-design.md § addendum): the Admin
  // Console's user management and audit reads. Role changes are additionally
  // required by that doc (:151) to audit old and new values — the service
  // enforces it, this key only gates who may try.
  "admin.users.manage": { roles: ["admin_op"], scope: "global" },
  "admin.capabilities.manage": { roles: ["admin_op"], scope: "global" },
  "admin.audit.read": { roles: ["admin_op"], scope: "global" },
  // --- Notify + PM modules (authorization-design.md § Permission Catalog) ---
  // notify.comment.create's catalog scope is "anchor (delegates to the
  // anchor's read permission)": the role gate lives here; the anchor-scope
  // delegation is resolveAnchor() in notify/service.ts, which calls the
  // anchor object's own read authorize (404 on non-visible anchors).
  "notify.comment.create": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "notify.preferences.manage": { roles: ["user", "editor", "admin_op"], scope: "self" },
  "pm.deadline.read": { roles: ["user", "editor", "admin_op"], scope: "space", spaceRole: "viewer" },
  "pm.deadline.edit": { roles: ["user", "editor", "admin_op"], scope: "space", spaceRole: "contributor" },
  // pm.board.manage: owned-or-assigned task updates for every member,
  // admin_op bypasses on role. The guild-board model (owner decision
  // 2026-07-21): whoever holds a task works it, whatever their role.
  "pm.board.manage": { roles: ["user", "editor", "admin_op"], scope: "owned-or-assigned" },
  // Every approved member sees the team's workload — the board is the shared
  // picture of who is carrying what (owner decision 2026-07-21).
  "pm.board.read": { roles: ["user", "editor", "admin_op"], scope: "global" },
  // Taking an unassigned task from the pool. Separate from manage because the
  // claimer by definition does not own the task yet; the service additionally
  // requires assigned_to IS NULL, so this can never reassign someone's work.
  "pm.task.claim": { roles: ["user", "editor", "admin_op"], scope: "global" },
  // Archiving a finished or mistaken task off the board.
  "pm.task.archive": { roles: ["user", "editor", "admin_op"], scope: "owned-or-assigned" },
};

export type PermissionKey = keyof typeof CATALOG;

const REQUIRED_CAPABILITY: Partial<Record<PermissionKey, string>> = {
  "circulation.loan.manage": "circulation.manage",
  "catalog.item.manage": "catalog.manage",
  "storage.space.manage": "spaces.manage",
  "knowledge.publish": "content.review",
  "review.corrected.approve": "content.review",
  "review.draft.approve": "content.review",
  "storage.source.read_all": "content.review",
  "export.tree.trigger": "system.operate",
  "admin.health.read": "system.operate",
  "admin.users.manage": "users.manage",
  "admin.capabilities.manage": "capabilities.manage",
  "admin.audit.read": "audit.read",
};

export type ResourceRef = {
  /** For space scope: the resource's space_id. */
  spaceId?: string;
  /** For self scope: the record's owning user id. */
  userId?: string;
  /**
   * For owned-or-assigned scope: created_by / submitted_by plus any active
   * assignment (authorization-design.md enforcement pipeline step 3).
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
  const capability = REQUIRED_CAPABILITY[permission];
  // Undefined preserves compatibility for callers that construct the old
  // Principal shape; resolved sessions always carry the explicit list.
  if (capability && !actor.capabilities.includes(capability)) throw denial;

  switch (entry.scope) {
    case "global":
      return actor;
    case "space": {
      if (!resource.spaceId) throw denial;
      const membership = actor.spaceMemberships.find((item) => item.spaceId === resource.spaceId);
      if (!membership) throw denial;
      if (
        entry.spaceRole &&
        ["viewer", "contributor", "manager"].indexOf(membership.role) <
          ["viewer", "contributor", "manager"].indexOf(entry.spaceRole)
      )
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
 * The one query-layer scoping helper (authorization-design.md forbids
 * per-endpoint ad hoc filtering): returns the space ids a list query may see,
 * or null for admin_op (no filter).
 */
export function scopedToSpaces(actor: Principal): string[] {
  return actor.spaceIds;
}
