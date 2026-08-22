import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  timeout: 30 * 1000,
  globalSetup: "./global-setup.ts",
  use: {
    headless: true,
    baseURL: "http://localhost:3000",
    storageState: "tests/e2e/.auth/admin.json",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "node scripts/start-e2e.mjs",
    cwd: process.cwd(),
    url: "http://localhost:3000/api/health",
    reuseExistingServer: false,
    timeout: 60 * 1000,
  },
});
