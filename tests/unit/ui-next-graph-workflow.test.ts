import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";

export async function run() {
  const route = "src/app/app/graph/page.tsx";
  assert.equal(existsSync(route), true, "target Graph route is missing");
  const page = readFileSync(route, "utf8");
  assert.match(page, /getAppResearchGraph/);
  assert.match(page, /targetGraph/);
  assert.doesNotMatch(page, /createGraphProvider|scope=personal|Branch/);
  assert.match(page, /name="projectId"/);
  assert.match(page, /project\.isPersonal/);

  const legacyRoute = readFileSync("src/app/graph/page.tsx", "utf8");
  assert.match(legacyRoute, /redirect\("\/app\/graph"\)/);

  const navigation = readFileSync("src/app/components/ui-next/shell/navigation.tsx", "utf8");
  assert.match(navigation, /href: "\/app\/graph"/);
  for (const key of [
    "nav.graph",
    "page.graph.title",
    "page.graph.description",
    "graph.kind.project",
    "graph.kind.note",
    "graph.kind.material",
    "graph.kind.person",
    "graph.kind.activity",
    "graph.filterProject",
    "graph.allProjects",
    "graph.scope",
    "projects.myProject",
  ] as const) {
    assert.ok(key in viMessages, `missing Vietnamese Graph key ${key}`);
    assert.ok(key in enMessages, `missing English Graph key ${key}`);
  }

  const facade = readFileSync("src/modules/application/graph.ts", "utf8");
  assert.match(facade, /researchReadableProjectIds/);
  assert.match(facade, /operationalProjectIds/);
  assert.match(facade, /noteSupportSourceVersions/);
  assert.doesNotMatch(facade, /nodeDrafts|extractionCandidates|treeNodes\.contentMd/);
}
