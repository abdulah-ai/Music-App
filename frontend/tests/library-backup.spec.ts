import { expect, test } from '@playwright/test';

const user = {
  id: 'backup-user', email: 'backup@starhollow.test', display_name: 'Backup Listener',
  storage_preference: 'auto', is_admin: false, cloud_storage_available: false,
};

const media = {
  id: 'backup-track', media_type: 'audio', source: 'youtube', source_url: 'https://example.com/track',
  title: 'Original title', artist: 'Original artist', album: null, thumbnail_url: null,
  recognized_title: null, recognized_artist: null, genre: null, release_year: null, is_remix: null,
  fade_in_ms: null, fade_out_ms: null, duration_seconds: 180, file_size_bytes: 1000,
  original_filename: 'track.mp3', mime_type: 'audio/mpeg', created_at: '2026-07-18T00:00:00Z',
};

test('Settings validates and restores a versioned backup file', async ({ page }) => {
  let restoredTitle = media.title;
  let playlist: Record<string, unknown> | null = null;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/auth/login')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ access_token: 'access', refresh_token: 'refresh', token_type: 'bearer', user }) });
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) });
    if (url.pathname.endsWith('/library') && request.method() === 'GET') return route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ ...media, title: restoredTitle }]) });
    if (url.pathname.endsWith(`/library/${media.id}`) && request.method() === 'PATCH') {
      restoredTitle = (request.postDataJSON() as { title: string }).title;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...media, title: restoredTitle }) });
    }
    if (url.pathname.endsWith('/playlists') && request.method() === 'GET') return route.fulfill({ contentType: 'application/json', body: JSON.stringify(playlist ? [playlist] : []) });
    if (url.pathname.endsWith('/playlists') && request.method() === 'POST') {
      playlist = { id: 'restored-playlist', name: 'Quiet orbit', artwork_url: null, created_at: '2026-07-18T00:00:00Z', items: [] };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(playlist) });
    }
    if (url.pathname.includes('/playlists/restored-playlist/items') && request.method() === 'POST') {
      playlist = { ...playlist!, items: [{ ...media, title: restoredTitle }] };
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(playlist) });
    }
    if (url.pathname.endsWith('/telegram/status')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ configured: false, authorized: false, username: null, phone: null }) });
    return route.fulfill({ contentType: 'application/json', body: request.method() === 'GET' ? '[]' : '{}' });
  });

  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('backup-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const backup = {
    format: 'starhollow-backup', version: 1, exportedAt: '2026-07-18T00:00:00Z', includes: [],
    data: {
      media: [media],
      customMetadata: [{ id: media.id, title: 'Restored title', artist: 'Restored artist', album: 'Night', genre: 'Ambient', release_year: 2026, is_remix: false }],
      playlists: [{ id: 'saved-playlist', name: 'Quiet orbit', artwork_url: null, mediaIds: [media.id] }],
      favoriteIds: [media.id], pinnedIds: [media.id],
      listeningHistory: [{ mediaId: media.id, title: 'Restored title', artist: 'Restored artist', mediaType: 'audio', at: 100, durationSeconds: 180 }],
      recognitionHistory: [{ id: 'scan-1', matched: true, title: 'Restored title', artist: 'Restored artist', thumbnailUrl: null, at: 90 }],
      offlineManifest: [{ id: media.id, title: 'Restored title', artist: 'Restored artist', mediaType: 'audio', sizeBytes: 1000, savedAt: '2026-07-18T00:00:00Z' }],
    },
  };
  page.once('dialog', (dialog) => dialog.accept());
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore backup' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'starhollow-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });

  await expect(page.getByText('Backup restored', { exact: true })).toBeVisible();
  await expect(page.getByText(/Restored 1 metadata records, 1 playlists and 4 saved preferences\/history/)).toBeVisible();
  expect(restoredTitle).toBe('Restored title');
});
