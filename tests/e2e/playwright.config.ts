import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 30 * 1000,
  use: {
    headless: true,
    baseURL: 'http://localhost:3000',
  },
});
