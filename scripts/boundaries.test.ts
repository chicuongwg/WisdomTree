// Layer-boundary suite, in the same spirit as authz-matrix.test.ts: the rule
// is not written in a doc and hoped for, it is asserted against the tree.
//
//   src/app/**       delivery (FE + route handlers) — may call services only
//   src/modules/**   business logic, one module per bounded context
//   src/db/**        schema and connection
//
// The rule: delivery code never touches the database. No `@/db`, no module
// `schema.ts`, no query builder. Pages and routes call a service, and the
// service owns the query — which is where authorization and space scoping
// live. This is not style: the one page that queried the database directly
// (deadlines/[id]) was also the one page with a cross-space leak, because the
// predicate a service would have carried was simply absent.
//
// Usage: npm run test:boundaries
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const DELIVERY = "src/app";
const FORBIDDEN: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /from\s+"@\/db"/, why: "imports the database connection" },
  { pattern: /from\s+"@\/modules\/[a-z-]+\/schema"/, why: "imports a module's table definitions" },
  { pattern: /from\s+"drizzle-orm"/, why: "imports the query builder" },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

const violations: string[] = [];
let checked = 0;

for (const file of walk(DELIVERY)) {
  checked += 1;
  const source = readFileSync(file, "utf8");
  for (const { pattern, why } of FORBIDDEN) {
    const line = source.split("\n").findIndex((l) => pattern.test(l));
    if (line >= 0) violations.push(`${file}:${line + 1} — ${why}`);
  }
}

if (violations.length) {
  console.error(`\nLayer boundary violated in ${violations.length} place(s):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    `\n${DELIVERY} is delivery code. Move the query into the owning src/modules/*/service.ts` +
      `\nand call that instead — the service is where authorize() and space scoping belong.\n`,
  );
  process.exit(1);
}

console.log(`Layer boundaries: ${checked} delivery files, no direct database access.`);
