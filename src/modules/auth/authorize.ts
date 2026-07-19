import { forbidden, notFound, unauthorized } from "@/lib/errors";
import type { Principal } from "./dev-auth";
import type { Role } from "./schema";

// The single authorize(actor, permission, resource) helper required by
// docs/design/authorization-design.md — route handlers never hand-roll
// checks. This is the demo subset of the permission catalog; keys and scope
// qualifiers are verbatim from the catalog table.

type Scope = "global" | "space" | "self" | "owned-or-assigned";

const CATALOG: Record<string, { roles: Role[]; scope: Scope }> = {
  "storage.intake.open": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "storage.library.browse": { roles: ["user", "editor", "admin_op"], scope: "space" },
  "storage.upload": { roles: ["user", "editor", "admin_op"], scope: "space" },
  "storage.submissions.read": { roles: ["user", "editor", "admin_op"], scope: "self" },
  "storage.download": { roles: ["user", "editor", "admin_op"], scope: "space" },
  "storage.search": { roles: ["user", "editor", "admin_op"], scope: "space" },
  "catalog.browse": { roles: ["user", "editor", "admin_op"], scope: "space" },
  "circulation.loan.request": { roles: ["user", "editor", "admin_op"], scope: "space" },
  "circulation.loan.manage": { roles: ["admin_op"], scope: "global" },
  "catalog.item.manage": { roles: ["admin_op"], scope: "global" },
  "storage.space.manage": { roles: ["admin_op"], scope: "global" },
  // --- Knowledge module (authorization-design.md § Permission Catalog) ---
  "knowledge.node.read": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "knowledge.search": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "knowledge.branch.create": { roles: ["editor", "admin_op"], scope: "global" },
  "knowledge.branch.edit": { roles: ["editor", "admin_op"], scope: "owned-or-assigned" },
  "knowledge.node.create": { roles: ["editor", "admin_op"], scope: "global" },
  "knowledge.node.edit": { roles: ["editor", "admin_op"], scope: "owned-or-assigned" },
  "knowledge.publish": { roles: ["admin_op"], scope: "global" },
  "knowledge.node.merge": { roles: ["admin_op"], scope: "global" },
  "knowledge.archive": { roles: ["admin_op"], scope: "global" },
  "storage.corrected.edit": { roles: ["editor", "admin_op"], scope: "owned-or-assigned" },
  "storage.draft.edit": { roles: ["editor", "admin_op"], scope: "owned-or-assigned" },
  "review.corrected.approve": { roles: ["admin_op"], scope: "global" },
  "review.draft.approve": { roles: ["admin_op"], scope: "global" },
  "storage.source.read_all": { roles: ["admin_op"], scope: "global" },
  // Not in the catalog table verbatim: curation assignment and gap triage are
  // Admin/Op flows (sequence-diagrams.md Flow 2, admin-op-flows.md); keyed
  // here as module.action pending a catalog addendum — flagged in the report.
  "storage.curation.assign": { roles: ["admin_op"], scope: "global" },
  "storage.gap.triage": { roles: ["admin_op"], scope: "global" },
  // --- Export module (authorization-design.md § Permission Catalog) ---
  "export.document": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "export.tree.trigger": { roles: ["admin_op"], scope: "global" },
  // Not in the catalog table verbatim: the Admin/Op health surface (openapi
  // GET /admin/health "Admin/Op") — keyed pending a catalog addendum like
  // storage.curation.assign; flagged in the report.
  "admin.health.read": { roles: ["admin_op"], scope: "global" },
  // --- Notify + PM modules (authorization-design.md § Permission Catalog) ---
  // notify.comment.create's catalog scope is "anchor (delegates to the
  // anchor's read permission)": the role gate lives here; the anchor-scope
  // delegation is resolveAnchor() in notify/service.ts, which calls the
  // anchor object's own read authorize (404 on non-visible anchors).
  "notify.comment.create": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "notify.preferences.manage": { roles: ["user", "editor", "admin_op"], scope: "self" },
  "pm.deadline.read": { roles: ["user", "editor", "admin_op"], scope: "space" },
  "pm.deadline.edit": { roles: ["user", "editor", "admin_op"], scope: "space" },
  // pm.board.manage: admin_op, with "editor: owned-or-assigned task updates"
  // (catalog note) — modeled as owned-or-assigned so an editor passes for
  // tasks they created or are assigned, and admin_op bypasses on role.
  "pm.board.manage": { roles: ["editor", "admin_op"], scope: "owned-or-assigned" },
  // Not in the catalog table verbatim: opening the board read surface
  // (openapi GET /board says "Editor, Admin/Op") — keyed pending a catalog
  // addendum like storage.curation.assign; flagged in the report.
  "pm.board.read": { roles: ["editor", "admin_op"], scope: "global" },
};

export type PermissionKey = keyof typeof CATALOG;

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

export function authorize(actor: Principal | null, permission: PermissionKey, resource: ResourceRef): Principal {
  if (!actor) throw unauthorized();
  const entry = CATALOG[permission];
  const denial = resource.kind === "read" ? notFound() : forbidden();

  if (!entry.roles.includes(actor.role)) throw denial;
  if (actor.role === "admin_op") return actor; // global scope everywhere

  switch (entry.scope) {
    case "global":
      return actor;
    case "space":
      if (!resource.spaceId || !actor.spaceIds.includes(resource.spaceId)) throw denial;
      return actor;
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
export function scopedToSpaces(actor: Principal): string[] | null {
  return actor.role === "admin_op" ? null : actor.spaceIds;
}
