import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { projectSwitchHref } from "@/app/app/projects/[projectId]/_components/project-switcher";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";

export async function run() {
  const moduleRoutes = ["notes", "materials", "activities", "tasks", "people", "library"];
  for (const module of moduleRoutes) {
    const route = `src/app/app/projects/[projectId]/${module}/page.tsx`;
    assert.equal(existsSync(route), true, `missing Project module route: ${module}`);
    assert.match(
      readFileSync(route, "utf8"),
      new RegExp(`requireProjectModule\\(projectId, "${module}"\\)`),
    );
  }

  const layout = readFileSync("src/app/app/projects/[projectId]/layout.tsx", "utf8");
  const context = readFileSync(
    "src/app/app/projects/[projectId]/_lib/workspace-context.ts",
    "utf8",
  );
  const header = readFileSync(
    "src/app/app/projects/[projectId]/_components/project-header.tsx",
    "utf8",
  );
  const navigation = readFileSync(
    "src/app/app/projects/[projectId]/_components/project-navigation.tsx",
    "utf8",
  );
  const projectContract = readFileSync("src/modules/application/projects.ts", "utf8");
  const appHeader = readFileSync("src/app/components/ui-next/shell/app-header.tsx", "utf8");
  const createDialog = readFileSync("src/app/components/ui-next/shell/create-dialog.tsx", "utf8");
  const workspaceSource = `${layout}\n${context}\n${header}\n${navigation}`;

  assert.match(context, /cache\(async \(projectId: string\)/);
  assert.match(context, /getProjectWorkspace\(context\.actor, projectId\)/);
  assert.match(context, /applicationError\.error === "not_found"/);
  assert.match(context, /applicationError\.error === "forbidden"/);
  assert.match(context, /notFound\(\)/);
  assert.match(header, /<h1>{project\.name}<\/h1>/);
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /modules\[item\.module\]/);
  assert.match(projectContract, /activities: project\.operationalMember/);
  assert.match(projectContract, /tasks: project\.operationalMember/);
  assert.match(projectContract, /library: project\.features\.libraryCirculation/);

  assert.equal(
    projectSwitchHref("project-b", "/app/projects/project-a/notes"),
    "/app/projects/project-b?module=notes",
  );
  assert.equal(
    projectSwitchHref("project-b", "/app/projects/project-a/tasks"),
    "/app/projects/project-b?module=tasks",
  );
  assert.equal(
    projectSwitchHref("project-b", "/app/projects/project-a"),
    "/app/projects/project-b",
  );

  const overview = readFileSync("src/app/app/projects/[projectId]/page.tsx", "utf8");
  assert.match(overview, /workspace\.modules\[requestedModule/);
  assert.match(overview, /redirect\(`\/app\/projects\/\$\{projectId\}\/\$\{requestedModule\}`\)/);
  assert.match(
    readFileSync("src/app/app/projects/[projectId]/library/page.tsx", "utf8"),
    /requireProjectModule\(projectId, "library"\)/,
  );

  assert.match(appHeader, /currentProjectId/);
  assert.match(appHeader, /defaultProjectId={currentProjectId}/);
  assert.match(createDialog, /projects\.find\(\(project\) => project\.id === defaultProjectId\)/);

  for (const forbidden of ["Personal Space", "Team Space", "WikiRelease", "Branch"]) {
    assert.equal(workspaceSource.includes(forbidden), false, `legacy term found: ${forbidden}`);
  }
  assert.doesNotMatch(workspaceSource, /@\/db|drizzle|schema\//);

  for (const key of [
    "project.overview",
    "project.notes",
    "project.materials",
    "project.activities",
    "project.tasks",
    "project.people",
    "project.library",
    "workspace.navigation",
    "workspace.switchProject",
    "workspace.chooseModule",
    "workspace.researchAccessDescription",
    "workspace.projectUnavailableTitle",
  ] as const) {
    assert.ok(viMessages[key]);
    assert.ok(enMessages[key]);
  }
}
