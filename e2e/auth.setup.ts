import { expect, test as setup } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const requiredEnv = ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD'] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
const authFile = path.join(process.cwd(), '.playwright', 'auth', 'user.json');

setup('authenticate reusable session', async ({ page }) => {
  setup.skip(missingEnv.length > 0, `Missing required E2E envs: ${missingEnv.join(', ')}`);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/login');
  await page.getByTestId('sign-in-email').fill(process.env.E2E_USER_EMAIL ?? '');
  await page.getByTestId('sign-in-password').fill(process.env.E2E_USER_PASSWORD ?? '');
  await page.getByTestId('auth-submit').click();

  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: authFile });
});
