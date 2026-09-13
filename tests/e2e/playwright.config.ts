import { defineConfig } from "@playwright/test";

const baseURL = `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  testDir: "./",
  timeout: 30 * 1000,
  // Fixtures share accounts and their persisted locale preferences.
  workers: 1,
  globalSetup: "./global-setup.ts",
  use: {
    headless: true,
    baseURL,
    storageState: "tests/e2e/.auth/admin.json",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "node scripts/start-e2e.mjs",
    cwd: process.cwd(),
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 60 * 1000,
  },
});
