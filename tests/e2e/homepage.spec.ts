import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const pc2Fixture = JSON.parse(readFileSync("tests/e2e/.auth/pc2.json", "utf8")) as {
  personalProjectId: string;
  noteId: string;
  materialId: string;
  sharedProjectId: string;
  materialTitle: string;
  activityId: string;
  activityTitle: string;
  taskId: string;
  taskTitle: string;
  sharedNoteId: string;
  publicSlug: string;
  collaboratorName: string;
};

test("a signed-out visitor lands on the login gate", async ({ browser }) => {
  // A fresh context without the storageState cookie = signed out.
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page).toHaveTitle(/WisdomTree/);
  await expect(page.locator(".login-page")).toBeVisible();
  await context.close();
});

test("a session cookie opens the app and the graph explorer", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main h1").first()).toBeVisible();

  await page.goto("/graph");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".knowledge-map:visible")).toHaveCount(1);
});

test("cron endpoint requires POST with bearer authentication", async ({ request }) => {
  expect((await request.get("/api/cron/dispatch")).status()).toBe(405);
  const response = await request.post("/api/cron/dispatch");
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({ ok: false, error: "unauthorized" });
});

test("PC2 target-native research seams are browser reachable", async ({ page }) => {
  await page.goto(`/app/projects/${pc2Fixture.personalProjectId}/notes/${pc2Fixture.noteId}`);
  await expect(page.getByRole("heading", { name: "Lịch sử", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Đưa vào Dự án chung" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mục lục", exact: true })).toBeVisible();

  await page.goto(
    `/app/projects/${pc2Fixture.personalProjectId}/materials/${pc2Fixture.materialId}`,
  );
  await expect(page.locator('form input[name="title"]')).toBeVisible();

  await page.goto("/app/account");
  await expect(page.getByText(pc2Fixture.materialTitle)).toBeVisible();

  await page.goto(`/app/projects/${pc2Fixture.sharedProjectId}/settings`);
  await expect(page.getByRole("heading", { name: "Xuất Dự án" })).toBeVisible();
});

test("PC3 target workspaces and delivery entry points are browser reachable", async ({ page }) => {
  await page.goto(
    `/app/projects/${pc2Fixture.sharedProjectId}/activities/${pc2Fixture.activityId}`,
  );
  await expect(page.getByRole("heading", { name: pc2Fixture.activityTitle })).toBeVisible();

  await page.goto(`/app/projects/${pc2Fixture.sharedProjectId}/tasks?view=kanban`);
  await expect(page.getByLabel("Kanban")).toBeVisible();
  await expect(page.getByRole("link", { name: pc2Fixture.taskTitle })).toBeVisible();

  await page.goto(`/app/projects/${pc2Fixture.sharedProjectId}/tasks/${pc2Fixture.taskId}`);
  await expect(page.getByRole("heading", { name: pc2Fixture.taskTitle })).toBeVisible();

  await page.goto("/app/calendar");
  await expect(page.getByRole("heading", { name: "Lịch công việc" })).toBeVisible();

  await page.goto("/app/graph");
  await expect(page.locator(".knowledge-map:visible")).toHaveCount(1);

  await page.goto("/app/admin");
  await expect(page.getByRole("heading", { name: "Quản trị TMKT" })).toBeVisible();
});

test("PC4 responsive collaboration, drawer, graph, and public routes remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `/app/projects/${pc2Fixture.sharedProjectId}/activities/${pc2Fixture.activityId}`,
  );
  const composer = page.getByRole("textbox", { name: "Viết thảo luận" });
  await composer.fill("@PC4");
  await expect(
    page
      .locator('.ui-next-mention-list [role="option"]')
      .filter({ hasText: pc2Fixture.collaboratorName }),
  ).toBeVisible();
  await composer.press("Tab");
  await expect(composer).toHaveValue(`@${pc2Fixture.collaboratorName} `);
  await expect(page.locator(".ui-next-comment--reply")).toHaveCount(1);

  await page.goto(`/app/projects/${pc2Fixture.sharedProjectId}/notes/${pc2Fixture.sharedNoteId}`);
  const inspector = page.getByRole("button", { name: "Thông tin chi tiết" });
  await inspector.focus();
  await inspector.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(inspector).toBeFocused();

  await page.goto(`/app/projects/${pc2Fixture.sharedProjectId}/tasks?view=kanban`);
  await expect(page.locator(".ui-next-kanban")).toHaveJSProperty(
    "scrollWidth",
    await page.locator(".ui-next-kanban").evaluate((element) => element.scrollWidth),
  );
  await expect
    .poll(() =>
      page
        .locator(".ui-next-kanban")
        .evaluate((element) => element.scrollWidth > element.clientWidth),
    )
    .toBe(true);

  for (const route of ["/app/graph", "/p", `/p/${pc2Fixture.publicSlug}`]) {
    await page.goto(route);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("PC4 notification deep-link remains usable at click time", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "tests/e2e/.auth/collaborator.json" });
  const page = await context.newPage();
  await page.goto("/app/notifications");
  const activityLink = page.locator(`a[href*="/activities/${pc2Fixture.activityId}"]`).first();
  await expect(activityLink).toBeVisible();
  await activityLink.click();
  await expect(page.getByRole("heading", { name: pc2Fixture.activityTitle })).toBeVisible();
  await context.close();
});
