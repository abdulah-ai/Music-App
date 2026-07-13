import { expect, test } from '@playwright/test';

import type { Media } from '../src/services/api/types';
import {
  buildMediaDetailSections,
  formatFileSummary,
  formatImportDate,
  formatMediaDuration,
  formatMediaSource,
} from '../src/utils/mediaDetails';

function media(overrides: Partial<Media> = {}): Media {
  return {
    id: 'detail-fixture',
    media_type: 'audio',
    source: 'telegram',
    source_url: null,
    title: 'Midnight Signal',
    artist: 'The Hollow',
    album: 'Afterglow',
    thumbnail_url: null,
    recognized_title: null,
    recognized_artist: null,
    genre: 'Ambient',
    release_year: 2025,
    is_remix: false,
    fade_in_ms: null,
    fade_out_ms: null,
    duration_seconds: 3723.9,
    file_size_bytes: 8 * 1024 * 1024,
    original_filename: 'midnight-signal.mp3',
    mime_type: 'audio/mpeg',
    created_at: '2026-07-13T10:30:00Z',
    ...overrides,
  };
}

test('formats source, duration, import date, and file facts for display', () => {
  expect(formatMediaSource('recognized_upload')).toBe('Identified recording');
  expect(formatMediaDuration(3723.9)).toBe('1:02:03');
  expect(formatImportDate('2026-07-13T10:30:00Z', 'en-US')).toBe('Jul 13, 2026');
  expect(formatFileSummary('track.mp3', 'audio/mpeg', 8 * 1024 * 1024)).toBe('MP3 · 8.0 MB');
});

test('builds rich music and archive sections from available API metadata', () => {
  const details = buildMediaDetailSections(media(), 'en-US');

  expect(details.music).toEqual([
    { key: 'album', label: 'Album', value: 'Afterglow' },
    { key: 'genre', label: 'Genre', value: 'Ambient' },
    { key: 'released', label: 'Released', value: '2025' },
  ]);
  expect(details.archive).toEqual([
    { key: 'duration', label: 'Duration', value: '1:02:03' },
    { key: 'source', label: 'Source', value: 'Telegram' },
    { key: 'imported', label: 'Added', value: 'Jul 13, 2026' },
    { key: 'file', label: 'File', value: 'MP3 · 8.0 MB' },
  ]);
});

test('omits absent optional metadata instead of rendering blank values', () => {
  const details = buildMediaDetailSections(media({
    album: '   ',
    genre: null,
    release_year: null,
    duration_seconds: null,
    file_size_bytes: null,
    original_filename: null,
    mime_type: null,
    created_at: 'not-a-date',
  }), 'en-US');

  expect(details.music).toEqual([]);
  expect(details.archive).toEqual([{ key: 'source', label: 'Source', value: 'Telegram' }]);
  expect(JSON.stringify(details)).not.toContain('null');
  expect(JSON.stringify(details)).not.toContain('undefined');
});
