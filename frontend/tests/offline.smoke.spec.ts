import { expect, test } from '@playwright/test';

/**
 * Real offline verification — no mocked "offline", the browser context
 * genuinely drops the network. Flow: visit once online (service worker
 * installs and precaches the shell + hashed bundle + fonts), sign in
 * (tokens + user land in localStorage, library snapshot in AsyncStorage),
 * kill the network, reload, and require the full signed-in dashboard to
 * come back from cache alone.
 */

const user = {
  id: 'offline-user',
  email: 'offline@starhollow.test',
  display_name: 'Offline Test',
  storage_preference: 'default',
  is_admin: false,
  cloud_storage_available: false,
  created_at: new Date().toISOString(),
};

const library = [
  {
    id: 'track-cached',
    media_type: 'audio',
    source: 'other_url',
    source_url: null,
    title: 'Cached Nightsong',
    artist: 'The Hollow',
    album: 'First Light',
    thumbnail_url: null,
    recognized_title: null,
    recognized_artist: null,
    genre: 'Ambient',
    release_year: 2024,
    is_remix: false,
    fade_in_ms: null,
    fade_out_ms: null,
    duration_seconds: 200,
    created_at: new Date().toISOString(),
  },
];

test('the signed-in dashboard opens fully offline after one online visit', async ({ page, context }) => {
  // Service worker installation + an offline reload need more than the 20s default.
  test.setTimeout(90_000);

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/login')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'access', refresh_token: 'refresh', token_type: 'bearer', user }),
      });
      return;
    }
    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) });
      return;
    }
    if (url.pathname.endsWith('/library') && route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(library) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
  });

  // --- Online visit: install the app ---
  await page.goto('/');
  await expect(page.getByText('Welcome back', { exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Bring a track home.', { exact: true })).toBeVisible();
  await expect(page.getByText('Cached Nightsong', { exact: true })).toBeVisible();

  // Wait until the service worker is active AND controlling this page —
  // only then is the offline shell truly installed.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15_000 })
    .toBe(true);

  // --- The lights go out ---
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await context.setOffline(true);
  await page.reload();

  // The shell must come back from the service worker cache, and the session
  // must restore from the cached token + profile instead of bouncing to login.
  await expect(page.getByText('Bring a track home.', { exact: true })).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText('Welcome back', { exact: true })).toHaveCount(0);

  // The cached library snapshot must be browsable offline.
  await expect(page.getByText('Cached Nightsong', { exact: true })).toBeVisible();

  // And the app must say so, honestly.
  await expect(page.getByText('Offline — playing from this device', { exact: true })).toBeVisible({ timeout: 15_000 });

  await context.setOffline(false);
});
