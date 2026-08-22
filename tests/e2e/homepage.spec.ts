import { test, expect } from "@playwright/test";

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
  await expect(page.locator("main h1")).toBeVisible();

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
