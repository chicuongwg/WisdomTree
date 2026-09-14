import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const entry = path.join(directory, name);
    return statSync(entry).isDirectory() ? filesBelow(entry) : [entry];
  });
}

function runE2eLauncher(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ["scripts/start-e2e.mjs"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 5_000,
  });
}

export async function run() {
  const routes = [
    "src/app/app/page.tsx",
    "src/app/app/projects/page.tsx",
    "src/app/app/my-work/page.tsx",
    "src/app/app/people/page.tsx",
    "src/app/app/search/page.tsx",
    "src/app/app/loading.tsx",
    "src/app/app/error.tsx",
  ];
  for (const route of routes)
    assert.equal(existsSync(route), true, `missing target route: ${route}`);

  const layout = readFileSync("src/app/app/layout.tsx", "utf8");
  assert.match(layout, /getAppRequestContext/);
  assert.match(layout, /ui-next-app-root/);
  assert.match(layout, /SkipLink href="#app-main"/);

  const navigation = readFileSync("src/app/components/ui-next/shell/navigation.tsx", "utf8");
  for (const href of [
    "/app",
    "/app/projects",
    "/app/calendar",
    "/app/my-work",
    "/app/people",
    "/app/search",
  ]) {
    assert.match(navigation, new RegExp(`href: "${href.replace("/", "\\/")}"`));
  }
  assert.match(navigation, /aria-current/);

  const quickSearch = readFileSync("src/app/components/ui-next/shell/quick-search.tsx", "utf8");
  assert.match(quickSearch, /event\.ctrlKey \|\| event\.metaKey/);
  assert.match(quickSearch, /ArrowDown/);
  assert.match(quickSearch, /ArrowUp/);
  assert.match(quickSearch, /event\.key === "Enter"/);
  assert.match(quickSearch, /\/api\/app\/search/);

  const createDialog = readFileSync("src/app/components/ui-next/shell/create-dialog.tsx", "utf8");
  assert.match(createDialog, /setProjectId\(project\.id\)/);
  assert.match(createDialog, /availableActions/);
  assert.match(createDialog, /disabled/);

  const accountMenu = readFileSync("src/app/components/ui-next/shell/account-menu.tsx", "utf8");
  const appHeader = readFileSync("src/app/components/ui-next/shell/app-header.tsx", "utf8");
  assert.match(accountMenu, /href="\/app\/account"/);

  const shellStyles = readFileSync("src/app/components/ui-next/shell.module.css", "utf8");
  assert.match(
    shellStyles,
    /@media \(max-width: 44rem\) \{[\s\S]*?\.ui-next-mobile-menu-trigger(?:\)|\s)*\{\s*display: inline-flex;/,
  );
  assert.match(
    shellStyles,
    /@media \(max-width: 44rem\) \{[\s\S]*?\.ui-next-app-sidebar(?:\)|\s)*\{\s*display: none;/,
  );
  assert.match(appHeader, /<Drawer/);
  assert.match(
    appHeader,
    /<GlobalNavigation[\s\S]*?canAccessAdministration={canAccessAdministration}[\s\S]*?onNavigate/,
  );

  for (const key of [
    "nav.overview",
    "nav.projects",
    "nav.calendar",
    "nav.myWork",
    "nav.people",
    "nav.search",
    "shell.quickSearch",
    "shell.new",
    "shell.account",
  ] as const) {
    assert.ok(viMessages[key]);
    assert.ok(enMessages[key]);
  }

  const targetSource = [
    ...filesBelow("src/app/components/ui-next/shell"),
    ...filesBelow("src/app/app"),
  ]
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  for (const forbidden of ["Personal Space", "Team Space", "WikiRelease", "SpaceShell", "Branch"]) {
    assert.equal(
      targetSource.includes(forbidden),
      false,
      `target shell contains legacy term: ${forbidden}`,
    );
  }

  const noTestUrl = { ...process.env };
  delete noTestUrl.TEST_DATABASE_URL;
  const missing = runE2eLauncher(noTestUrl);
  assert.notEqual(missing.status, 0);
  assert.match(`${missing.stdout}${missing.stderr}`, /TEST_DATABASE_URL is required/);

  const normalDatabase = runE2eLauncher({
    ...process.env,
    TEST_DATABASE_URL: "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree",
  });
  assert.notEqual(normalDatabase.status, 0);
  assert.match(
    `${normalDatabase.stdout}${normalDatabase.stderr}`,
    /not explicitly named as a test database/,
  );
}
