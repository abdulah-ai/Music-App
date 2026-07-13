import { expect, test, type Page } from '@playwright/test';

const currentUser = {
  id: 'current-user', email: 'current@starhollow.test', display_name: 'Current Listener',
  storage_preference: 'auto', is_admin: false, cloud_storage_available: false,
};

const otherUser = {
  id: 'other-user', email: 'other@starhollow.test', display_name: 'Other Listener',
  storage_preference: 'auto', is_admin: false, cloud_storage_available: false,
};

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/login')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'current-access', refresh_token: 'current-refresh', token_type: 'bearer', user: currentUser }),
      });
      return;
    }
    if (path.endsWith('/auth/me')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(currentUser) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
}

test('switching remembered accounts requires reauthentication and clears active tokens', async ({ page }) => {
  await page.addInitScript((rememberedUser) => {
    localStorage.setItem('sma.rememberedAccounts.v1', JSON.stringify([
      { user: rememberedUser, lastUsedAt: '2026-07-12T12:00:00.000Z' },
    ]));
  }, otherUser);
  await mockApi(page);

  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(currentUser.email);
  await page.getByLabel('Password', { exact: true }).fill('current-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Bring a track home.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Open account menu' }).click();
  await expect(page.getByRole('button', { name: 'Add another account' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Other Listener' }).click();

  await expect(page.getByText('Switching account · sign in to keep every library private', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(otherUser.email);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  const activeSecrets = await page.evaluate(() => ({
    access: localStorage.getItem('sma.accessToken'),
    refresh: localStorage.getItem('sma.refreshToken'),
  }));
  expect(activeSecrets).toEqual({ access: null, refresh: null });
});
