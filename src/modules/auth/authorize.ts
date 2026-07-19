import { forbidden, notFound, unauthorized } from "@/lib/errors";
import type { Principal } from "./dev-auth";
import type { Role } from "./schema";

// The single authorize(actor, permission, resource) helper required by
// docs/design/authorization-design.md — route handlers never hand-roll
// checks. This is the demo subset of the permission catalog; keys and scope
// qualifiers are verbatim from the catalog table.

type Scope = "global" | "space" | "self";

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
};

export type PermissionKey = keyof typeof CATALOG;

export type ResourceRef = {
  /** For space scope: the resource's space_id. */
  spaceId?: string;
  /** For self scope: the record's owning user id. */
  userId?: string;
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
