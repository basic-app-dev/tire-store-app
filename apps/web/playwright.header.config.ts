import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'header.spec.ts',
  use: { baseURL: 'http://localhost:3100', headless: true },
  workers: 1,
});
