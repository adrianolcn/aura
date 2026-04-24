import { expect, test } from '@playwright/test';

const requiredEnv = ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD'] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
const e2eClientName = process.env.E2E_CLIENT_NAME;
const shouldSendTemplate = process.env.E2E_SEND_TEMPLATE === 'true';

test.describe('AURA web inbox flow', () => {
  test.skip(
    missingEnv.length > 0,
    `Missing required E2E envs: ${missingEnv.join(', ')}`,
  );

  test('authenticates and opens the client inbox flow', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('sign-in-email').fill(process.env.E2E_USER_EMAIL ?? '');
    await page
      .getByTestId('sign-in-password')
      .fill(process.env.E2E_USER_PASSWORD ?? '');
    await page.getByTestId('auth-submit').click();

    await expect(page).toHaveURL(/dashboard/);

    await page.goto('/clients');

    if (e2eClientName) {
      await page.getByTestId('clients-search').fill(e2eClientName);
    }

    const clientRows = page.locator('[data-testid^="client-row-"]');
    await expect(clientRows.first()).toBeVisible();
    await clientRows.first().click();

    await expect(page.getByTestId('client-detail-title')).toBeVisible();
    await expect(page.getByTestId('client-conversation')).toBeVisible();

    const optInButton = page.getByTestId('opt-in-button');
    await optInButton.click();
    await expect(page.getByText(/sucesso/i).first()).toBeVisible();

    const thread = page.getByTestId('conversation-thread');
    await expect(thread).toBeVisible();

    const templateSelect = page.getByTestId('template-select');
    if ((await templateSelect.count()) > 0 && shouldSendTemplate) {
      const parameterInputs = page.locator('[data-testid^="template-param-"]');
      const parameterCount = await parameterInputs.count();

      for (let index = 0; index < parameterCount; index += 1) {
        await parameterInputs.nth(index).fill('Teste E2E');
      }

      const sendTemplateButton = page.getByTestId('send-template-button');
      await expect(sendTemplateButton).toBeEnabled();
      await sendTemplateButton.click();
      await expect(page.getByText(/sucesso/i).first()).toBeVisible();
    }

    await expect(thread).toBeVisible();
  });
});
