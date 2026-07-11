import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 20_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'off',
  },
  webServer: {
    command: 'node scripts/serve-dist.js',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
