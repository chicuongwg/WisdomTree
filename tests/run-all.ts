import { readdirSync } from "node:fs";
import path from "node:path";
import { configureIsolatedTestDatabase } from "./db-safety";

const root = path.resolve(process.cwd());
const target = process.argv[2];

if (!target) {
  console.error("Usage: tsx tests/run-all.ts <path>");
  process.exit(1);
}

const base = path.resolve(root, target);
const statefulSuites = ["tests/integration", "tests/usecase", "tests/privacy"].map((dir) =>
  path.resolve(root, dir),
);

if (statefulSuites.some((dir) => base === dir || base.startsWith(`${dir}${path.sep}`))) {
  configureIsolatedTestDatabase();
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return full.endsWith(".test.ts") || full.endsWith(".test.tsx") ? [full] : [];
    })
    .sort();
}

const files = walk(base);
if (!files.length) {
  throw new Error(`No test files found in ${target}`);
}

async function runTests() {
  let passed = 0;
  for (const file of files) {
    console.log(`Running ${path.relative(root, file)}`);
    const mod = await import(file);
    if (typeof mod.run !== "function") {
      throw new Error(`${path.relative(root, file)} must export a run() function`);
    }
    await mod.run();
    passed += 1;
  }
  console.log(`Passed ${passed} test file${passed === 1 ? "" : "s"}.`);
}

runTests().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
