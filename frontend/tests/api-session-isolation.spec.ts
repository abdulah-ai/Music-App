import { expect, test } from '@playwright/test';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { apiClient, invalidateApiSession } from '../src/services/api/client';

test('a late API response from the previous account is discarded', async () => {
  const values = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    },
  };
  const previousAdapter = apiClient.defaults.adapter;
  let release: (() => void) | undefined;

  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => new Promise<AxiosResponse>((resolve) => {
    release = () => resolve({
      data: { private: 'old-account-data' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  });

  try {
    const staleRequest = apiClient.get('/previous-account');
    await expect.poll(() => !!release).toBe(true);

    invalidateApiSession();
    release?.();

    await expect(staleRequest).rejects.toThrow('previous account');
  } finally {
    apiClient.defaults.adapter = previousAdapter;
    delete (globalThis as any).window;
  }
});
