import assert from "node:assert/strict";
import { authorize } from "@/modules/auth/authorize";
import { ApiError } from "@/lib/errors";
import type { Principal } from "@/modules/auth/principal";

// The permission catalog's contract, in one runnable file (replaces the old
// doc-parsing authz-matrix test): role gates, the 404-on-read / 403-on-write
// denial rule, the space-role ladder, self scope, owned-or-assigned scope,
// and the deliberately-empty role lists.

const SPACE = "11111111-1111-1111-1111-111111111111";
const OTHER_SPACE = "22222222-2222-2222-2222-222222222222";

function actor(
  role: Principal["role"],
  memberships: Principal["spaceMemberships"] = [],
): Principal {
  return {
    userId: "acting-user",
    role,
    spaceIds: memberships.map((m) => m.spaceId),
    spaceMemberships: memberships,
  };
}

function denied(fn: () => void, status: number, code: string) {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof ApiError, "must be an ApiError");
    assert.equal(err.status, status);
    assert.equal(err.code, code);
    return true;
  });
}

export const run = async () => {
  const member = actor("user", [{ spaceId: SPACE, role: "viewer" }]);
  const contributor = actor("user", [{ spaceId: SPACE, role: "contributor" }]);
  const manager = actor("user", [{ spaceId: SPACE, role: "manager" }]);
  const editor = actor("editor", [{ spaceId: SPACE, role: "contributor" }]);
  const outsideEditor = actor("editor");
  const admin = actor("admin_op");

  // Role gates: admin-only keys refuse members and editors.
  for (const key of [
    "admin.users.manage",
    "admin.audit.read",
    "admin.health.read",
    "storage.space.manage",
    "library.physical.manage",
    "circulation.loan.manage",
    "export.tree.trigger",
    "storage.source.read_all",
  ] as const) {
    authorize(admin, key, { kind: "write" });
    denied(() => authorize(member, key, { kind: "write" }), 403, "forbidden");
    denied(() => authorize(editor, key, { kind: "write" }), 403, "forbidden");
  }

  // The review boundary: an editor must contribute to the target space;
  // Admin/Op remains the cross-space break-glass role.
  authorize(editor, "knowledge.publish", { spaceId: SPACE, kind: "write" });
  authorize(admin, "knowledge.publish", { spaceId: SPACE, kind: "write" });
  denied(
    () => authorize(outsideEditor, "knowledge.publish", { spaceId: SPACE, kind: "write" }),
    403,
    "forbidden",
  );
  denied(() => authorize(member, "knowledge.publish", { kind: "write" }), 403, "forbidden");

  // Denial rule: a denied READ is a 404 (no existence leak), a denied WRITE
  // is a 403 — same key, different verb.
  denied(() => authorize(member, "admin.audit.read", { kind: "read" }), 404, "not_found");
  denied(() => authorize(member, "admin.users.manage", { kind: "write" }), 403, "forbidden");

  // Space scope: membership in THAT space is required; another space's
  // membership does not carry over, and the ladder is viewer < contributor
  // < manager.
  authorize(member, "storage.library.browse", { spaceId: SPACE, kind: "read" });
  denied(
    () => authorize(member, "storage.library.browse", { spaceId: OTHER_SPACE, kind: "read" }),
    404,
    "not_found",
  );
  denied(
    () => authorize(member, "storage.upload", { spaceId: SPACE, kind: "write" }),
    403,
    "forbidden",
  );
  authorize(contributor, "storage.upload", { spaceId: SPACE, kind: "write" });
  denied(
    () => authorize(contributor, "storage.space.members.manage", { spaceId: SPACE, kind: "write" }),
    403,
    "forbidden",
  );
  authorize(manager, "storage.space.members.manage", { spaceId: SPACE, kind: "write" });
  authorize(manager, "export.space.release", { spaceId: SPACE, kind: "write" });
  authorize(admin, "export.space.release", { spaceId: SPACE, kind: "write" });
  denied(
    () => authorize(contributor, "export.space.release", { spaceId: SPACE, kind: "write" }),
    403,
    "forbidden",
  );
  // Admin role alone does not bypass a space scope it has no membership in.
  denied(
    () => authorize(admin, "storage.library.browse", { spaceId: SPACE, kind: "read" }),
    404,
    "not_found",
  );

  // Self scope: only the record's own user.
  authorize(member, "storage.submissions.read", { userId: member.userId, kind: "read" });
  denied(
    () => authorize(member, "storage.submissions.read", { userId: "someone-else", kind: "read" }),
    404,
    "not_found",
  );

  // Owned-or-assigned scope.
  authorize(member, "pm.board.manage", { ownerIds: [member.userId, null], kind: "write" });
  denied(
    () => authorize(member, "pm.board.manage", { ownerIds: ["someone-else"], kind: "write" }),
    403,
    "forbidden",
  );

  // Personal branch/node creation is owned, so every role passes only for its
  // own resource.
  for (const key of ["knowledge.branch.create", "knowledge.node.create"] as const) {
    authorize(admin, key, { ownerIds: [admin.userId], kind: "write" });
    authorize(member, key, { ownerIds: [member.userId], kind: "write" });
    denied(
      () => authorize(member, key, { ownerIds: ["someone-else"], kind: "write" }),
      403,
      "forbidden",
    );
  }

  // No principal at all → 401.
  denied(() => authorize(null, "knowledge.node.read", { kind: "read" }), 401, "unauthorized");
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
