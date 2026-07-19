// Dev-mode substitution boundary (docs/roadmap/demo-brief.md): the demo signs
// in via a user picker over the seeded users (one per role) and issues a
// session; V1 swaps in Google OIDC behind the same session shape. The
// principal matches docs/design/authorization-design.md § Principals:
// resolved once per request, spaceIds cached per request.

import type { Role } from "./schema";

export interface Principal {
  userId: string;
  role: Role;
  /** Memberships from space_members, resolved once per request. */
  spaceIds: string[];
}

export interface AuthProvider {
  /** Resolve the request principal from the session cookie, or null → 401. */
  resolvePrincipal(sessionToken: string | undefined): Promise<Principal | null>;
  /** Dev picker: issue a session for a seeded user. */
  signInAs(userId: string): Promise<{ sessionToken: string }>;
  signOut(sessionToken: string): Promise<void>;
}

// Implementation lands in step 2 (build), together with the single
// authorize(actor, permission, resource) helper and scopedToSpaces query
// helper required by authorization-design.md.
