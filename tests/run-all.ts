import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.cwd());
const target = process.argv[2];

if (!target) {
  console.error("Usage: tsx tests/run-all.ts <path>");
  process.exit(1);
}

const base = path.resolve(root, target);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith(".test.ts") || full.endsWith(".test.tsx") ? [full] : [];
  });
}

const files = walk(base);
if (!files.length) {
  console.log(`No test files found in ${target}`);
  process.exit(0);
}

async function runTests() {
  for (const file of files) {
    console.log(`Running ${path.relative(root, file)}`);
    const mod = await import(file);
    if (typeof mod.run === "function") {
      await mod.run();
    }
  }
}

runTests().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
