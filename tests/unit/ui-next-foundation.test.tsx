import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  enMessages,
  formatUiNumber,
  interpolateMessage,
  translate,
  viMessages,
} from "@/app/components/ui-next/localization";
import { getErrorPresentation } from "@/app/components/ui-next/feedback/error-presentation";

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const entry = path.join(directory, name);
    return statSync(entry).isDirectory() ? filesBelow(entry) : [entry];
  });
}

export async function run() {
  const requiredKeys = [
    "nav.overview",
    "nav.projects",
    "nav.myWork",
    "nav.people",
    "nav.search",
    "common.create",
    "common.cancel",
    "common.save",
    "common.close",
    "common.loading",
    "status.saved",
    "status.saving",
    "status.failed",
    "project.overview",
    "project.notes",
    "project.materials",
  ];

  assert.deepEqual(Object.keys(enMessages).sort(), Object.keys(viMessages).sort());
  for (const key of requiredKeys) assert.ok(key in viMessages, `missing VI key: ${key}`);
  assert.equal(translate("unsupported", "nav.projects"), "Dự án");
  assert.equal(translate("en", "nav.projects"), "Projects");
  assert.equal(formatUiNumber(1234.5, "vi"), "1.234,5");
  assert.deepEqual(getErrorPresentation("version_conflict"), {
    titleKey: "error.versionConflict.title",
    descriptionKey: "error.versionConflict.description",
  });

  const unicode = "Huế — 漢文 — 日本語 — 한국어 — العربية — 𠀀";
  assert.equal(interpolateMessage("{value}", { value: unicode }), unicode);
  assert.equal(translate("en", "common.nameExample", { name: unicode }), `Item: ${unicode}`);

  const root = path.resolve("src/app/components/ui-next");
  const source = filesBelow(root)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  for (const forbidden of ["WikiRelease", "Personal Space", "Team Space", "SpaceShell", "Branch"]) {
    assert.equal(
      source.includes(forbidden),
      false,
      `new foundation contains legacy wording: ${forbidden}`,
    );
  }

  const dialogSource = readFileSync(path.join(root, "overlays/dialog.tsx"), "utf8");
  assert.match(dialogSource, /showModal\(\)/);
  assert.match(dialogSource, /aria-labelledby/);
  assert.match(dialogSource, /onCancel/);
  assert.match(dialogSource, /restoreFocusRef/);

  const researchSource = readFileSync(path.join(root, "typography/research-content.tsx"), "utf8");
  assert.match(researchSource, /dir = "auto"/);
  const buttonSource = readFileSync(path.join(root, "primitives/button.tsx"), "utf8");
  assert.match(buttonSource, /aria-busy/);
  assert.match(buttonSource, /disabled=\{disabled \|\| loading\}/);
  assert.match(buttonSource, /"aria-label": string/);
}
