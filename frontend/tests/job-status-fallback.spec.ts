import { expect, test } from '@playwright/test';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '../src/services/api/client';
import { watchJob } from '../src/services/api/jobSocket';
import type { Job } from '../src/services/api/types';
import { tokenStorage } from '../src/services/storage/tokenStorage';

function job(status: Job['status'], updatedAt: string): Job {
  return {
    id: 'youtube-job',
    job_type: 'download',
    status,
    progress_pct: status === 'complete' ? 100 : 25,
    stage_label: status === 'complete' ? 'complete' : 'downloading',
    source_url: 'https://www.youtube.com/watch?v=test',
    error_message: null,
    result_media: null,
    match_title: null,
    match_artist: null,
    match_thumbnail_url: null,
    created_at: '2026-07-13T00:00:00Z',
    updated_at: updatedAt,
  };
}

test('polling reaches terminal state when the job WebSocket stays silent', async () => {
  const previousAdapter = apiClient.defaults.adapter;
  const previousWebSocket = globalThis.WebSocket;
  const previousWindow = (globalThis as any).window;
  const stored = new Map<string, string>();
  let requests = 0;

  class SilentWebSocket {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(_url: string) {}

    close() {}
  }

  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    requests += 1;
    const data = requests === 1
      ? job('in_progress', '2026-07-13T00:00:01Z')
      : job('complete', '2026-07-13T00:00:02Z');
    return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
  };
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
      clear: () => stored.clear(),
      key: (index: number) => [...stored.keys()][index] ?? null,
      get length() { return stored.size; },
    },
  };
  (globalThis as any).WebSocket = SilentWebSocket;
  await tokenStorage.setAccessToken('test-access-token');

  const updates: Job[] = [];
  const stop = watchJob('youtube-job', (update) => updates.push(update));
  try {
    await expect.poll(() => updates.at(-1)?.status, { timeout: 5000 }).toBe('complete');
    expect(requests).toBeGreaterThanOrEqual(2);
  } finally {
    stop();
    apiClient.defaults.adapter = previousAdapter;
    (globalThis as any).WebSocket = previousWebSocket;
    await tokenStorage.clear();
    (globalThis as any).window = previousWindow;
  }
});
