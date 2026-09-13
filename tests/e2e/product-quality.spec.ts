import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { toAppInput } from "../../src/lib/time";

const fixture = JSON.parse(readFileSync("tests/e2e/.auth/pc2.json", "utf8")) as {
  personalProjectId: string;
  sharedProjectId: string;
  noteId: string;
  materialId: string;
  activityId: string;
  taskId: string;
};

async function renderedPage(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.ok(), route).toBe(true);
  await expect(page.locator("main h1").first()).toBeVisible();
  const container = page.locator("main > .ui-next-container");
  await expect(container).toBeVisible();
  const headerGap = await page.locator(".ui-next-app-header").evaluate((header) => {
    const search = header.querySelector(".ui-next-quick-search-trigger")!.getBoundingClientRect();
    const utilities = header
      .querySelector(".ui-next-app-header__utilities")!
      .getBoundingClientRect();
    return utilities.left - search.right;
  });
  expect(headerGap, `Header controls must not overlap at ${route}`).toBeGreaterThanOrEqual(7.5);
  const gutter = await container.evaluate((element) => {
    const main = element.parentElement!.getBoundingClientRect();
    const content = element.getBoundingClientRect();
    return Math.min(content.left - main.left, main.right - content.right);
  });
  expect(gutter, `Shared page gutter at ${route}`).toBeGreaterThanOrEqual(
    page.viewportSize()!.width <= 704 ? 15.5 : 31.5,
  );
  await expect(page.getByText(/^(Đã xảy ra lỗi|Something went wrong)$/)).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), {
      message: `Document overflow at ${route}`,
    })
    .toBe(true);
}

for (const role of ["admin", "collaborator"] as const) {
  test.describe(role, () => {
    test.use({ storageState: `tests/e2e/.auth/${role}.json` });
    for (const width of [1440, 1280, 1024, 768, 390]) {
      test(`completed workspaces fit ${width}px in VI and EN`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        const project = `/app/projects/${fixture.sharedProjectId}`;
        try {
          for (const locale of ["vi", "en"]) {
            expect((await page.request.patch("/api/app/locale", { data: { locale } })).ok()).toBe(
              true,
            );
            for (const route of [
              "/app",
              "/app/projects",
              "/app/calendar",
              "/app/calendar?view=week",
              "/app/my-work",
              "/app/people",
              "/app/search",
              "/app/notifications",
              "/app/graph",
              ...[
                "",
                "/notes",
                "/materials",
                "/activities",
                "/tasks",
                "/tasks?view=kanban",
                "/people",
              ].map((suffix) => project + suffix),
              `${project}/activities/${fixture.activityId}`,
              `${project}/tasks/${fixture.taskId}`,
              ...(role === "admin"
                ? [
                    `${project}/settings`,
                    `/app/projects/${fixture.personalProjectId}/notes/${fixture.noteId}`,
                    `/app/projects/${fixture.personalProjectId}/materials/${fixture.materialId}`,
                  ]
                : []),
            ]) {
              await renderedPage(page, route);
              await expect(page.locator("html")).toHaveAttribute("lang", locale);
            }
            if (width <= 704) {
              await renderedPage(page, `${project}/tasks`);
              await expect(
                page.locator(".ui-next-project-navigation__select select"),
              ).toBeVisible();
            }
          }
        } finally {
          await page.request.patch("/api/app/locale", { data: { locale: "vi" } });
        }
      });
    }
  });
}

test("quick navigation, themes, and search filters have keyboard-accessible localized controls", async ({
  page,
}) => {
  await renderedPage(page, "/app");
  const trigger = page.getByRole("button", { name: /Tìm nhanh/ });
  await trigger.focus();
  await trigger.press("Enter");
  const search = page.getByRole("combobox");
  await expect(search).toBeFocused();
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(8);
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", /-1$/);
  await search.press("Tab");
  await expect(page.getByRole("button", { name: "Xem tất cả kết quả", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(search).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.locator(".ui-next-account-menu summary").click();
  const theme = page.getByRole("combobox", { name: "Giao diện", exact: true });
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".ui-next-account-menu summary").click();
  await page.getByRole("combobox", { name: "Giao diện", exact: true }).selectOption("light");
  await page.getByRole("combobox", { name: "Giao diện", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".ui-next-account-menu summary")).toBeFocused();
  await expect(page.locator(".ui-next-account-menu__panel")).not.toBeVisible();
  await page.locator(".ui-next-account-menu summary").click();
  await page.locator("#ui-next-shell-locale").selectOption("en");
  try {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await renderedPage(page, "/app/search");
    await expect(page.getByRole("combobox", { name: "Result type" })).toBeVisible();
    await renderedPage(page, "/app/graph");
    await expect(page.getByRole("button", { name: "Zoom in", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thu nhỏ bản đồ", exact: true })).toHaveCount(0);
  } finally {
    await page.request.patch("/api/app/locale", { data: { locale: "vi" } });
  }
});

test("contributors cannot access or save Project settings", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    storageState: "tests/e2e/.auth/collaborator.json",
  });
  try {
    const page = await context.newPage();
    const project = `/app/projects/${fixture.sharedProjectId}`;
    await renderedPage(page, project);
    await expect(page.locator(`nav a[href="${project}/settings"]`)).toHaveCount(0);
    await page.goto(`${project}/settings`);
    await expect(page.getByRole("button", { name: /^Lưu/ })).toHaveCount(0);
    const response = await context.request.patch(`/api/app/projects/${fixture.sharedProjectId}`, {
      data: { expectedVersion: 0, researchLens: "Unauthorized change" },
    });
    expect(response.status()).toBe(403);
    await renderedPage(page, `${project}/tasks?task=${fixture.taskId}`);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const taskUpdate = await context.request.patch(
      `${project.replace("/app/", "/api/app/")}/tasks/${fixture.taskId}`,
      {
        data: { expectedVersion: 1, title: "Unauthorized task edit" },
      },
    );
    expect(taskUpdate.status()).toBe(403);
  } finally {
    await context.close();
  }
});

test("zoom-equivalent layouts retain Task views and readable administration forms", async ({
  page,
}) => {
  for (const width of [960, 720, 640]) {
    await page.setViewportSize({ width, height: 600 });
    await renderedPage(page, "/app/admin");
    await expect(page.locator("#admin-project-name")).toBeVisible();
    await renderedPage(page, `/app/projects/${fixture.sharedProjectId}/tasks`);
    const views = page.getByRole("navigation", { name: "Chế độ xem công việc" });
    await expect(views.getByRole("link", { name: "Kanban", exact: true })).toBeVisible();
    await expect(views.getByRole("link", { name: "Lịch", exact: true })).toBeVisible();
    await views.getByRole("link", { name: "Kanban", exact: true }).click();
    await expect(page.locator(".ui-next-kanban")).toBeVisible();
  }
  await renderedPage(page, `/app/projects/${fixture.sharedProjectId}/tasks?task=${fixture.taskId}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("desktop sidebar collapse persists and retains named navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await renderedPage(page, "/app");
  const collapse = page.getByRole("button", { name: "Thu gọn thanh bên", exact: true });
  await collapse.click();
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
  const projects = page.getByRole("link", { name: "Dự án", exact: true });
  await expect(projects).toBeVisible();
  await projects.focus();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
  await page.getByRole("button", { name: "Mở rộng thanh bên", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "expanded");
});

test("shared buttons communicate focus, hover, pressed, disabled and loading states", async ({
  page,
}) => {
  await renderedPage(page, `/app/projects/${fixture.sharedProjectId}/tasks`);
  const trigger = page.getByRole("button", { name: "+ Tạo mới", exact: true });
  await page.mouse.move(0, 0);
  const background = () => trigger.evaluate((button) => getComputedStyle(button).backgroundColor);
  const resting = await background();
  await trigger.focus();
  expect(await trigger.evaluate((button) => getComputedStyle(button).outlineStyle)).not.toBe(
    "none",
  );
  await trigger.hover();
  await expect.poll(background).not.toBe(resting);
  const hovered = await background();
  await page.mouse.down();
  await expect.poll(background).not.toBe(hovered);
  await page.mouse.up();
  await page.getByRole("dialog").getByRole("button", { name: "Ghi chú", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tạo và soạn thảo", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");

  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/app/projects/${fixture.sharedProjectId}/tasks`, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "Công việc mới", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Tiêu đề", { exact: true })
      .fill(`Button state review ${Date.now()}`);
    const submit = page.getByRole("dialog").getByRole("button", { name: /Tạo công việc/ });
    await submit.click();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(submit).toBeDisabled();
    expect(await submit.evaluate((button) => getComputedStyle(button).cursor)).toBe("progress");
  } finally {
    release();
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Create reaches Material intake and an empty Project explains its sparse map", async ({
  page,
}) => {
  await renderedPage(page, `/app/projects/${fixture.personalProjectId}`);
  await page.getByRole("button", { name: "+ Tạo mới", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tư liệu", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${fixture.personalProjectId}/materials$`));
  await expect(page.locator("main h1").first()).toBeVisible();

  const response = await page.request.post("/api/app/projects", {
    data: { name: "Quality review empty Project", researchLens: "A research question" },
  });
  expect(response.status()).toBe(201);
  const { project } = await response.json();
  await renderedPage(page, `/app/graph?projectId=${project.id}`);
  await expect(
    page.getByRole("heading", { name: "Bản đồ nghiên cứu đang hình thành" }),
  ).toBeVisible();
  await expect(page.locator(".knowledge-map:visible")).toHaveCount(1);
});

test("the final manager sees an explanation and unavailable roster actions", async ({ page }) => {
  await renderedPage(page, `/app/projects/${fixture.sharedProjectId}/settings`);
  await expect(
    page.getByRole("combobox", { name: "Vai trò trong Dự án của Phạm Thu Hương" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Xóa Phạm Thu Hương khỏi Dự án" })).toBeDisabled();
  await expect(
    page.getByText("Quản lý cuối cùng — hãy chỉ định một quản lý khác trước."),
  ).toBeVisible();
  const remove = page
    .locator(".ui-next-governance__actions .ui-next-button--danger:not(:disabled)")
    .first();
  expect(
    await remove.evaluate(
      (button) =>
        getComputedStyle(button).color === getComputedStyle(button.querySelector("span")!).color,
    ),
  ).toBe(true);
});

test("Calendar keeps view and scope on Today and exposes busy dates progressively", async ({
  page,
}) => {
  const dueAt = toAppInput(new Date().toISOString());
  for (let index = 0; index < 4; index++) {
    const response = await page.request.post(`/api/app/projects/${fixture.sharedProjectId}/tasks`, {
      data: { title: `Quality busy date ${Date.now()} ${index}`, dueAt: new Date().toISOString() },
    });
    expect(response.status()).toBe(201);
  }
  await renderedPage(
    page,
    `/app/calendar?view=week&projectId=${fixture.sharedProjectId}&w=2026-01-01`,
  );
  await page.getByRole("link", { name: "Hôm nay", exact: true }).click();
  const current = new URL(page.url());
  expect(current.searchParams.get("view")).toBe("week");
  expect(current.searchParams.get("projectId")).toBe(fixture.sharedProjectId);
  await renderedPage(
    page,
    `/app/calendar?projectId=${fixture.sharedProjectId}&m=${dueAt.slice(0, 7)}`,
  );
  const overflow = page.locator(".ui-next-calendar__overflow").first();
  await expect(overflow).toBeVisible();
  await overflow.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(overflow).toHaveAttribute("open", "");
  await expect(overflow.locator("a").first()).toBeVisible();
});

test("research creation connects a dated Activity Task to My Work, Calendar, and Search", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = Date.now();
  const project = `/app/projects/${fixture.sharedProjectId}`;
  const materialTitle = `Quality material ${suffix}`;
  const noteTitle = `Quality note ${suffix}`;
  const activityTitle = `Quality activity ${suffix}`;
  const taskTitle = `Quality task ${suffix}`;
  const personName = `Quality research person ${suffix}`;
  const dueAt = toAppInput(new Date(Date.now() + 86_400_000).toISOString());

  await renderedPage(page, `${project}/materials`);
  await page.getByRole("button", { name: "Tư liệu mới", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tiêu đề", { exact: true }).fill(materialTitle);
  await page
    .getByRole("dialog")
    .locator('input[type="file"]')
    .setInputFiles({
      name: "quality-material.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("A research original."),
    });
  await page.getByRole("button", { name: "Đăng ký tư liệu", exact: true }).click();
  await expect(page.getByRole("heading", { name: materialTitle, exact: true })).toBeVisible();

  await page.getByRole("button", { name: "+ Tạo mới", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ghi chú", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tiêu đề", { exact: true }).fill(noteTitle);
  await page.getByRole("button", { name: "Tạo và soạn thảo", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${project}/notes/`));
  await expect(
    page.locator("main").getByRole("textbox", { name: "Tiêu đề", exact: true }),
  ).toHaveValue(noteTitle);

  await renderedPage(page, `${project}/people`);
  await page.getByLabel("Tên hiển thị", { exact: true }).fill(personName);
  await page.getByRole("button", { name: "Thêm hồ sơ người", exact: true }).click();
  await expect(page.getByRole("link", { name: personName, exact: true })).toBeVisible();

  await renderedPage(page, `${project}/activities`);
  await page.getByRole("button", { name: "Hoạt động mới", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tiêu đề", { exact: true }).fill(activityTitle);
  await page.getByRole("button", { name: "Tạo hoạt động", exact: true }).click();
  await expect(page.getByRole("heading", { name: activityTitle, exact: true })).toBeVisible();

  await renderedPage(page, `${project}/tasks`);
  await page.getByRole("button", { name: "Công việc mới", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tiêu đề", { exact: true }).fill(taskTitle);
  await dialog
    .getByRole("combobox", { name: "Người phụ trách", exact: true })
    .selectOption({ label: "Phạm Thu Hương" });
  await dialog
    .getByRole("combobox", { name: "Hoạt động", exact: true })
    .selectOption({ label: activityTitle });
  await dialog.getByLabel("Hạn thực hiện", { exact: true }).fill(dueAt);
  const createdTask = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().endsWith("/tasks"),
  );
  await page.getByRole("button", { name: "Tạo công việc", exact: true }).click();
  expect((await createdTask).status()).toBe(201);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button").filter({ hasText: taskTitle })).toBeVisible();

  await renderedPage(page, "/app/my-work");
  const work = page.locator("main a").filter({ hasText: taskTitle });
  await expect(work).toBeVisible();
  await work.click();
  await expect(page.getByRole("heading", { name: taskTitle, exact: true })).toBeVisible();
  await renderedPage(page, `/app/calendar?m=${dueAt.slice(0, 7)}`);
  const calendarTask = page.locator("main a").filter({ hasText: taskTitle });
  if (!(await calendarTask.isVisible())) {
    await calendarTask.locator("xpath=ancestor::details").locator("summary").click();
  }
  await expect(calendarTask).toBeVisible();
  await renderedPage(page, `/app/search?q=${encodeURIComponent(materialTitle)}`);
  await expect(page.getByRole("link", { name: materialTitle, exact: true })).toBeVisible();
});
