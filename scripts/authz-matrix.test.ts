// Matrix-as-test-fixture suite (docs/design/authorization-design.md § Matrix as
// Test Fixture): parses the Matrix table in docs/requirements/permissions-matrix.md
// and the normative key-mapping tables in docs/design/authorization-design.md at
// run time, then asserts every row against the REAL authorize() implementation.
// An unmapped matrix row, an unknown cell phrase, or an unlisted missing key
// fails the run — the docs and the implementation cannot drift silently.
//
// Usage: npm run test:authz  (pure unit level — no HTTP, no DB)
import { readFileSync } from "node:fs";
import { authorize, type PermissionKey } from "../src/modules/auth/authorize";
import type { Principal } from "../src/modules/auth/dev-auth";

const MATRIX_DOC = "docs/requirements/permissions-matrix.md";
const MAPPING_DOC = "docs/design/authorization-design.md";

// Capabilities whose key is not enforceable through authorize() in the demo.
// Silent skips are forbidden — every entry carries its reason.
const ALLOWLIST: Record<string, string> = {
  "auth.signin": "session creation happens before authorize() (dev-login / OIDC callback)",
  "storage.gap.create": "gap-request creation rides storage.intake.open in the demo routes",
  "audit.node.read": "node audit-summary surface not built in the demo",
  "storage.trust.change": "no trust-mutation endpoint in the demo",
  "knowledge.taxonomy.manage": "tags managed inline via node edit; no dedicated taxonomy surface",
  "catalog.item.flag": "lost/repair flags ride catalog.item.manage (PATCH /api/catalog/:id)",
  "catalog.link_source": "digitization link rides catalog.item.manage (PATCH /api/catalog/:id)",
  "storage.personal_space": "personal spaces are ordinary spaces enforced by space scope",
  "review.queue.read": "addendum key; demo queue reads authorize via review.draft.approve",
};

// ---------- doc parsing ----------

function tableRows(md: string, headerMarker: string): string[][] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.includes(headerMarker));
  if (start < 0) throw new Error(`table header not found: ${headerMarker}`);
  const rows: string[][] = [];
  for (let i = start + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    rows.push(cells);
  }
  return rows;
}

const matrixMd = readFileSync(MATRIX_DOC, "utf8");
const mappingMd = readFileSync(MAPPING_DOC, "utf8");

const matrix = tableRows(matrixMd, "| Capability | User | Editor | Admin/Op |");

const stripTicks = (s: string) => s.replace(/`/g, "").trim();
const mainMapping = tableRows(mappingMd, "| Permission key | Matrix row | Roles | Scope |")
  .filter((r) => r[0].includes("`"))
  .map((r) => ({ key: stripTicks(r[0]), row: r[1] }));
const addendum = tableRows(mappingMd, "| Permission key | Capability | Roles | Scope |")
  .filter((r) => r[0].includes("`"))
  .map((r) => stripTicks(r[0]));

const rowToKey = new Map(mainMapping.map((m) => [m.row, m.key]));

// ---------- fixtures ----------

const SPACE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // membership space
const SPACE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // non-member space
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"; // unrelated user id

const principals: Record<string, Principal> = {
  user: {
    userId: "11111111-1111-4111-8111-111111111111",
    role: "user",
    spaceIds: [SPACE_A],
    spaceMemberships: [{ spaceId: SPACE_A, role: "contributor" }],
    capabilities: [],
  },
  editor: {
    userId: "22222222-2222-4222-8222-222222222222",
    role: "editor",
    spaceIds: [SPACE_A],
    spaceMemberships: [{ spaceId: SPACE_A, role: "contributor" }],
    capabilities: [],
  },
  admin_op: {
    userId: "33333333-3333-4333-8333-333333333333",
    role: "admin_op",
    spaceIds: [SPACE_A],
    spaceMemberships: [{ spaceId: SPACE_A, role: "manager" }],
    capabilities: [
      "capabilities.manage",
      "users.manage",
      "audit.read",
      "catalog.manage",
      "circulation.manage",
      "spaces.manage",
      "system.operate",
      "content.review",
    ],
  },
};

const allowed = (p: Principal, key: PermissionKey, res: Parameters<typeof authorize>[2]) => {
  try {
    authorize(p, key, res);
    return true;
  } catch {
    return false;
  }
};

// Most favorable in-scope resource for this actor, and the out-of-scope twin.
const favorable = (p: Principal) => ({
  kind: "write" as const,
  spaceId: SPACE_A,
  userId: p.userId,
  ownerIds: [p.userId],
});
const outOfScope = () => ({
  kind: "write" as const,
  spaceId: SPACE_B,
  userId: OTHER,
  ownerIds: [OTHER],
});
const assignedOnly = (p: Principal) => ({
  kind: "write" as const,
  spaceId: SPACE_B,
  userId: OTHER,
  ownerIds: [OTHER, p.userId], // not creator, but actively assigned
});

// ---------- assertions ----------

let passed = 0;
const findings: string[] = [];
const skipped: string[] = [];
function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`AUTHZ TEST FAILED: ${name}`);
  passed++;
}

const roles = ["user", "editor", "admin_op"] as const;

for (const [capability, ...cells] of matrix) {
  const key = rowToKey.get(capability);
  if (!key) throw new Error(`DRIFT: matrix row has no mapping in ${MAPPING_DOC}: "${capability}"`);
  if (ALLOWLIST[key]) {
    skipped.push(`${key} — ${ALLOWLIST[key]}`);
    continue;
  }
  roles.forEach((role, i) => {
    const phrase = cells[i];
    const p = principals[role];
    const k = key as PermissionKey;
    switch (phrase) {
      case "Yes":
        ok(`${capability} / ${role}: allowed in scope`, allowed(p, k, favorable(p)));
        break;
      case "No":
        ok(`${capability} / ${role}: denied even in scope`, !allowed(p, k, favorable(p)));
        break;
      case "Member spaces only":
      case "Within member spaces":
      case "Project members":
        ok(`${capability} / ${role}: allowed in member space`, allowed(p, k, favorable(p)));
        ok(`${capability} / ${role}: denied outside member space`, !allowed(p, k, outOfScope()));
        break;
      case "Owned or assigned only":
      case "Limited task updates on owned or assigned work":
        ok(`${capability} / ${role}: allowed when owner`, allowed(p, k, favorable(p)));
        ok(`${capability} / ${role}: allowed when assigned`, allowed(p, k, assignedOnly(p)));
        ok(`${capability} / ${role}: denied when unrelated`, !allowed(p, k, outOfScope()));
        break;
      case "Within member spaces plus assigned items":
        ok(`${capability} / ${role}: allowed in member space`, allowed(p, k, favorable(p)));
        ok(`${capability} / ${role}: denied outside member space`, !allowed(p, k, outOfScope()));
        findings.push(
          `${capability} / ${role}: "plus assigned items" is a query-layer union (scopedToSpaces + assignment filter), not expressible through authorize() — asserted the space part only`,
        );
        break;
      case "Limited to owned or assigned items":
        ok(`${capability} / ${role}: allowed when owner`, allowed(p, k, favorable(p)));
        ok(`${capability} / ${role}: denied when unrelated`, !allowed(p, k, outOfScope()));
        break;
      case "Limited suggestion only":
        // taxonomy row is allowlisted; reaching here means a new row reused the
        // phrase — treat as owned-or-assigned editor variant per the suite doc.
        ok(`${capability} / ${role}: allowed when owner (suggestion)`, allowed(p, k, favorable(p)));
        ok(`${capability} / ${role}: denied when unrelated`, !allowed(p, k, outOfScope()));
        break;
      default:
        throw new Error(`DRIFT: unknown matrix cell phrase "${phrase}" on row "${capability}"`);
    }
  });
}

// Read-vs-write denial semantics (house rule: 404 on reads, 403 on writes).
for (const kind of ["read", "write"] as const) {
  try {
    authorize(principals.user, "storage.download", { kind, spaceId: SPACE_B });
    throw new Error("AUTHZ TEST FAILED: out-of-scope download must throw");
  } catch (e) {
    const status = (e as { status?: number }).status;
    ok(`denial status for ${kind} is ${kind === "read" ? 404 : 403}`, status === (kind === "read" ? 404 : 403));
  }
}

// Reverse drift: every implementation key must be named by the docs
// (main mapping, addendum, or allowlist reasoning).
const implSource = readFileSync("src/modules/auth/authorize.ts", "utf8");
const implKeys = [...implSource.matchAll(/^\s*"([a-z_.]+)":\s*\{ roles:/gm)].map((m) => m[1]);
const documented = new Set([...mainMapping.map((m) => m.key), ...addendum]);
for (const k of implKeys) {
  ok(`implementation key documented: ${k}`, documented.has(k));
}

console.log(`\nAuthz matrix suite: ${passed} assertions passed, ${matrix.length} matrix rows.`);
console.log(`Skipped (allowlisted, with reasons):`);
for (const s of skipped) console.log(`  - ${s}`);
if (findings.length) {
  console.log(`Findings (matrix nuances not expressible in authorize()):`);
  for (const f of findings) console.log(`  - ${f}`);
}
