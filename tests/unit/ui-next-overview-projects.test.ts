import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { orderProjects } from "@/app/app/_components/project-list";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";
import type { AppProjectDto } from "@/modules/application";

function project(
  id: string,
  name: string,
  status: AppProjectDto["status"],
  operationalMember: boolean,
  libraryCirculation = false,
): AppProjectDto {
  return {
    id,
    name,
    status,
    operationalMember,
    researchReadable: true,
    researchLens: `${name} lens`,
    description: null,
    personalOwnerId: null,
    isPersonal: false,
    features: { libraryCirculation },
    capabilities: {
      canEditProject: false,
      canCreateNote: false,
      canCreateMaterial: false,
      canCreateActivity: false,
      canCreateTask: false,
      canManagePeople: false,
      canPublish: false,
      canManageLibraryOperators: false,
      isLibraryOperator: false,
    },
  };
}

export async function run() {
  const ordered = orderProjects(
    [
      project("4", "Archived work", "archived", true),
      project("2", "Research only", "active", false),
      project("3", "Paused work", "paused", true),
      project("1", "Active work", "active", true),
    ],
    "en",
  );
  assert.deepEqual(
    ordered.map(({ id }) => id),
    ["1", "3", "4", "2"],
    "work access must sort before research-only access, then status and name",
  );

  const overviewPage = readFileSync("src/app/app/page.tsx", "utf8");
  const projectsPage = readFileSync("src/app/app/projects/page.tsx", "utf8");
  const projectList = readFileSync("src/app/app/_components/project-list.tsx", "utf8");
  const overviewService = readFileSync("src/modules/application/overview.ts", "utf8");
  const screenSource = `${overviewPage}\n${projectsPage}\n${projectList}`;

  assert.match(overviewPage, /getTmktOverview\(actor\)/);
  assert.match(projectsPage, /getAppRequestContext/);
  assert.match(projectList, /href={`\/app\/projects\/\$\{project\.id\}`}/);
  assert.match(projectList, /project\.features\.libraryCirculation/);
  assert.doesNotMatch(projectList, /project\.name\s*(?:===|includes|startsWith|endsWith)/);
  assert.match(overviewService, /listAppMyWorkTasks/);

  for (const forbidden of [
    "DashboardWidget",
    "WidgetRenderer",
    "Recently edited",
    "Trending research",
    "Recommended research",
    "completion percentage",
  ]) {
    assert.equal(
      screenSource.includes(forbidden),
      false,
      `unexpected overview concept: ${forbidden}`,
    );
  }

  for (const rawRole of ["viewer", "contributor", "manager", "admin_op", "editor"]) {
    assert.equal(screenSource.includes(`>${rawRole}<`), false, `raw role is rendered: ${rawRole}`);
  }

  for (const key of [
    "page.overview.title",
    "overview.myWork.title",
    "overview.myWork.emptyTitle",
    "overview.projects.title",
    "overview.continue.title",
    "projects.workAccess",
    "projects.researchAccess",
    "projects.library",
    "projects.emptyTitle",
  ] as const) {
    assert.ok(viMessages[key]);
    assert.ok(enMessages[key]);
  }
}
