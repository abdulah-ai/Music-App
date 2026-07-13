import { expect, test } from '@playwright/test';

import type { Media } from '../src/services/api/types';
import { firstPlaylistArtworkItem } from '../src/utils/mediaDisplay';

function media(id: string, thumbnailUrl: string | null): Media {
  return {
    id,
    media_type: 'audio',
    source: 'youtube',
    source_url: null,
    title: id,
    artist: null,
    album: null,
    thumbnail_url: thumbnailUrl,
    recognized_title: null,
    recognized_artist: null,
    genre: null,
    release_year: null,
    is_remix: null,
    fade_in_ms: null,
    fade_out_ms: null,
    duration_seconds: null,
    file_size_bytes: null,
    original_filename: null,
    mime_type: null,
    created_at: '2026-07-13T00:00:00Z',
  };
}

test('playlist cover prefers the first item with real artwork', () => {
  const first = media('first', null);
  const second = media('second', 'https://example.test/cover.jpg');

  expect(firstPlaylistArtworkItem([first, second])).toBe(second);
});

test('playlist cover keeps a stable item fallback when no art exists', () => {
  const first = media('first', null);
  const second = media('second', null);

  expect(firstPlaylistArtworkItem([first, second])).toBe(first);
  expect(firstPlaylistArtworkItem([])).toBeNull();
});
