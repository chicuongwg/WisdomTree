import { expect, test, type Page } from "@playwright/test";

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function expectVisiblePage(page: Page) {
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading").first()).toBeVisible();
  const firstInteractive = page.locator("a, button, [tabindex='0']").first();
  if ((await firstInteractive.count()) > 0) {
    await firstInteractive.focus();
    await expect(firstInteractive).toBeFocused();
  }
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
}

async function expectWorkspaceStyles(page: Page, theme: "light" | "dark") {
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("complementary")).toBeVisible();

  const styles = await page.evaluate(() => {
    const root = document.querySelector(".ui-next");
    const shell = document.querySelector(".ui-next-app-shell");
    const sidebar = document.querySelector(".ui-next-app-sidebar");
    if (!root || !shell || !sidebar) return null;
    const rootStyles = getComputedStyle(root);
    const shellStyles = getComputedStyle(shell);
    return {
      background: rootStyles.getPropertyValue("--ui-color-background").trim(),
      display: shellStyles.display,
      columns: shellStyles.gridTemplateColumns,
      sidebarWidth: getComputedStyle(sidebar).width,
    };
  });

  expect(styles).not.toBeNull();
  expect(styles?.background).toBe(theme === "light" ? "#f6f7f4" : "#29343d");
  expect(styles?.display).toBe("grid");
  expect(styles?.columns).not.toBe("none");
  expect(styles?.columns.trim().split(/\s+/)).toHaveLength(2);
  expect(Number.parseFloat(styles?.sidebarWidth ?? "0")).toBeGreaterThan(0);
}

for (const theme of ["light", "dark"] as const) {
  test(`authenticated UI-next routes render in ${theme} theme without console errors`, async ({
    context,
    page,
  }) => {
    await context.addInitScript(
      (savedTheme) => localStorage.setItem("wt-theme", savedTheme),
      theme,
    );
    const consoleErrors = captureConsoleErrors(page);

    for (const route of ["/app", "/app/projects", "/app/people", "/app/search"]) {
      await page.goto(route);
      await expectVisiblePage(page);
      await expectWorkspaceStyles(page, theme);
    }

    expect(consoleErrors).toEqual([]);
  });
}

test("signed-out Login and public routes remain responsive at 390px", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: undefined,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const consoleErrors = captureConsoleErrors(page);

  for (const route of ["/login", "/p"]) {
    await page.goto(route);
    await expectVisiblePage(page);
  }

  expect(consoleErrors).toEqual([]);
  await context.close();
});
