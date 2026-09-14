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
  const firstLink = page.getByRole("link").first();
  await firstLink.focus();
  await expect(firstLink).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
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
