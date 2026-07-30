import { test, expect } from "@playwright/test";

test("signed-out homepage presents the login picker", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/WisdomTree/);
  await expect(page.locator(".login-person").first()).toBeVisible();
});

test("demo login opens the graph explorer", async ({ page }) => {
  await page.goto("/");
  await page.locator(".login-person").first().click();
  await page.waitForURL("/");
  const cookies = await page.context().cookies();
  expect(cookies).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "session", httpOnly: true })]),
  );

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
