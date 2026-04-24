import { defineConfig } from '@playwright/test';
import path from 'node:path';

const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;
const authFile = path.join(process.cwd(), '.playwright', 'auth', 'user.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        storageState: authFile,
      },
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer:
    process.env.E2E_SKIP_WEB_SERVER === 'true'
      ? undefined
      : {
          command: `corepack pnpm --filter @aura/web dev --hostname 127.0.0.1 --port ${port}`,
          url: `${baseURL}/login`,
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
        },
});
