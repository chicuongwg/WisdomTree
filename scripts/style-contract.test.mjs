import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const appRoot = path.resolve("src/app");
const workspaceLayout = path.join(appRoot, "app", "layout.tsx");
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(appRoot);
const cssFiles = files.filter((file) => file.endsWith(".css"));
const sourceFiles = files.filter((file) => /\.(ts|tsx)$/.test(file));

if (!existsSync(path.join(appRoot, "foundation.css"))) failures.push("missing foundation.css");
if (existsSync(path.join(appRoot, "globals.css"))) failures.push("globals.css must be removed");

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/import\s+(?:[^"']+?\s+from\s+)?["']([^"']+\.css)["']/g)) {
    const imported = match[1];
    const isWorkspaceStyle =
      /components\/ui-next\/(?:styles|shell|overview-projects|project-workspace|notes|materials|activities-tasks|calendar|library|governance|account|collaboration)\.css$/.test(
        imported,
      );
    if (
      !imported.endsWith(".module.css") &&
      !imported.endsWith("foundation.css") &&
      !(file === workspaceLayout && isWorkspaceStyle)
    ) {
      failures.push(`${path.relative(process.cwd(), file)} imports global ${imported}`);
    }
  }
}

const tokenSources = cssFiles
  .filter((file) => file.endsWith("foundation.css") || file.endsWith("styles.css"))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const definedTokens = new Set(
  [...tokenSources.matchAll(/(--(?:ui-)?[\w-]+)\s*:/g)].map((match) => match[1]),
);

for (const file of cssFiles) {
  const css = readFileSync(file, "utf8");
  for (const match of css.matchAll(/var\((--ui-[\w-]+)/g)) {
    if (!definedTokens.has(match[1])) {
      failures.push(`${path.relative(process.cwd(), file)} references undefined ${match[1]}`);
    }
  }

  if (!file.endsWith("foundation.css") && !file.endsWith("styles.css")) {
    if (/(?:#[0-9a-f]{3,8}\b|\brgba?\()/i.test(css)) {
      failures.push(`${path.relative(process.cwd(), file)} contains a raw visual color`);
    }
  }
}

const activeUiRoot = path.join(appRoot, "app") + path.sep;
for (const file of sourceFiles.filter((file) => file.startsWith(activeUiRoot))) {
  if (/style=\{\{/.test(readFileSync(file, "utf8"))) {
    failures.push(`${path.relative(process.cwd(), file)} contains an inline visual style`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Style contract passed.");
