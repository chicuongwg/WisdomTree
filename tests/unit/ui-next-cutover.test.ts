import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

export async function run() {
  const root = readFileSync("src/app/page.tsx", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const targetLayout = readFileSync("src/app/app/layout.tsx", "utf8");
  const navigation = readFileSync("src/app/components/ui-next/shell/navigation.tsx", "utf8");

  assert.match(root, /redirect\("\/app"\)/);
  for (const legacyShellName of ["ShellRail", "ShellSidebar", "CommandPalette"]) {
    assert.equal(layout.includes(legacyShellName), false, `${legacyShellName} must not be active`);
  }
  assert.equal(targetLayout.includes("ShellIsolation"), false);

  for (const href of ["/tree", "/board", "/library", "/review", "/wiki/releases"]) {
    assert.equal(navigation.includes(href), false, `target navigation links legacy route ${href}`);
  }

  for (const deletedRoute of [
    "src/app/board/page.tsx",
    "src/app/tree/page.tsx",
    "src/app/library/page.tsx",
    "src/app/review/page.tsx",
    "src/app/wiki/releases/page.tsx",
    "src/app/new-ui-preview/page.tsx",
  ]) {
    assert.equal(existsSync(deletedRoute), false, `legacy route must be removed: ${deletedRoute}`);
  }

  for (const targetRoute of [
    "src/app/app/page.tsx",
    "src/app/app/projects/page.tsx",
    "src/app/app/projects/[projectId]/page.tsx",
    "src/app/app/projects/[projectId]/notes/page.tsx",
    "src/app/app/projects/[projectId]/notes/[noteId]/page.tsx",
    "src/app/app/my-work/page.tsx",
    "src/app/app/people/page.tsx",
    "src/app/app/search/page.tsx",
  ]) {
    assert.equal(existsSync(targetRoute), true, `target route missing: ${targetRoute}`);
  }
}
