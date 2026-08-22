import type { Role } from "./schema";

/**
 * The request principal (docs/design/authorization-design.md § Principals):
 * resolved once per request from the session, memberships cached on it.
 * Roles carry the vertical axis (user | editor | admin_op); space
 * memberships carry the horizontal one.
 */
export interface Principal {
  userId: string;
  role: Role;
  /** Memberships from space_members, resolved once per request. */
  spaceIds: string[];
  spaceMemberships: Array<{
    spaceId: string;
    role: "viewer" | "contributor" | "manager";
  }>;
}
