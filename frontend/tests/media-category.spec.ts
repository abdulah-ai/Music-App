import { expect, test } from '@playwright/test';

import { categoryForGenre } from '../src/utils/mediaCategory';

test('maps common provider genres into stable library categories', () => {
  expect(categoryForGenre('Hip-Hop/Rap')).toBe('hip-hop');
  expect(categoryForGenre('R&B/Soul')).toBe('rnb');
  expect(categoryForGenre('Electronic Dance')).toBe('electronic');
  expect(categoryForGenre('Alternative Rock')).toBe('rock');
  expect(categoryForGenre('K-Pop')).toBe('pop');
  expect(categoryForGenre('Film Soundtrack')).toBe('soundtracks');
});

test('keeps missing and uncommon provider genres distinct', () => {
  expect(categoryForGenre(undefined)).toBe('uncategorized');
  expect(categoryForGenre('')).toBe('uncategorized');
  expect(categoryForGenre('World')).toBe('other');
});
