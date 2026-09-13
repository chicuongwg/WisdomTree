import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";

export async function run() {
  const root = "src/app";
  const deliveryFiles = [
    `${root}/api/app/projects/[projectId]/activities/route.ts`,
    `${root}/api/app/projects/[projectId]/activities/[activityId]/route.ts`,
    `${root}/api/app/projects/[projectId]/activities/[activityId]/context/route.ts`,
    `${root}/api/app/projects/[projectId]/tasks/route.ts`,
    `${root}/api/app/projects/[projectId]/tasks/[taskId]/route.ts`,
    `${root}/api/app/projects/[projectId]/tasks/[taskId]/claim/route.ts`,
    `${root}/api/app/projects/[projectId]/tasks/[taskId]/activity/route.ts`,
  ];
  for (const file of deliveryFiles) {
    assert.equal(existsSync(file), true, `missing target delivery route ${file}`);
    assert.doesNotMatch(readFileSync(file, "utf8"), /@\/db|drizzle-orm/);
  }

  for (const page of [
    `${root}/app/projects/[projectId]/activities/page.tsx`,
    `${root}/app/projects/[projectId]/activities/[activityId]/page.tsx`,
    `${root}/app/projects/[projectId]/tasks/page.tsx`,
    `${root}/app/my-work/page.tsx`,
  ]) {
    const source = readFileSync(page, "utf8");
    assert.doesNotMatch(source, /ProjectModulePlaceholder|PagePlaceholder/);
  }

  const activityFacade = readFileSync("src/modules/application/activities.ts", "utf8");
  assert.match(activityFacade, /getAppActivityWorkspace/);
  const taskFacade = readFileSync("src/modules/application/tasks.ts", "utf8");
  assert.match(taskFacade, /listAppMyWorkTasks/);
  assert.match(taskFacade, /listAppProjectTaskAssignees/);
  assert.match(taskFacade, /claimProjectTask/);
  assert.match(
    taskFacade,
    /canEdit: task\.createdBy === actor\.userId \|\| task\.assignedTo === actor\.userId/,
  );
  const taskView = readFileSync(
    `${root}/app/projects/[projectId]/tasks/_components/tasks-view.tsx`,
    "utf8",
  );
  assert.match(taskView, /task\.canEdit \? \(/);
  assert.match(taskView, /ui-next-task-list__row--readonly/);
  assert.match(taskView, /ui-next-kanban/);
  assert.match(taskView, /tasks\.view\.kanban/);
  const myWork = readFileSync("src/modules/application/overview.ts", "utf8");
  assert.match(myWork, /listAppMyWorkTasks/);

  for (const key of [
    "activities.title",
    "activities.participants",
    "activities.materials",
    "activities.notes",
    "activities.tasks",
    "tasks.title",
    "tasks.field.activity",
    "myWork.description",
  ] as const) {
    assert.ok(key in viMessages, `missing Vietnamese key ${key}`);
    assert.ok(key in enMessages, `missing English key ${key}`);
  }
}
