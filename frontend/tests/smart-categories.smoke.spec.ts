import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 'category-user', email: 'categories@starhollow.test', display_name: 'Category Listener',
  storage_preference: 'auto', is_admin: false, cloud_storage_available: false,
};

const base = {
  media_type: 'audio', source: 'telegram', source_url: null, album: null,
  thumbnail_url: null, recognized_title: null, recognized_artist: null,
  release_year: null, is_remix: false, fade_in_ms: null, fade_out_ms: null,
  duration_seconds: 180, created_at: '2026-07-13T12:00:00Z',
};

const library = [
  { ...base, id: 'pop-track', title: 'Forest Pop', artist: 'Canopy', genre: 'Pop' },
  { ...base, id: 'rap-track', title: 'Night Verse', artist: 'Hollow MC', genre: 'Hip-Hop/Rap' },
  { ...base, id: 'unknown-track', title: 'Untitled Grove', artist: null, genre: null },
];

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/login')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'category-access', refresh_token: 'category-refresh', token_type: 'bearer', user }),
      });
      return;
    }
    if (path.endsWith('/auth/me')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) });
      return;
    }
    if (path.endsWith('/library') && route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(library) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });
}

test('Library smart categories expose recognized genres without moving tracks', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('category-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('tab', { name: 'Library' }).click();
  await page.getByRole('tab', { name: 'Categories' }).click();

  await expect(page.getByText('Smart categories', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pop, 1 item' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hip-Hop & Rap, 1 item' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Uncategorized, 1 item' })).toBeVisible();

  await page.getByRole('button', { name: 'Pop, 1 item' }).click();
  await expect(page.getByRole('button', { name: 'Forest Pop, Canopy, Pop' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Night Verse, Hollow MC, Hip-Hop/Rap' })).toHaveCount(0);
});
