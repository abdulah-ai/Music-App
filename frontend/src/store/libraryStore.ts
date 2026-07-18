import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as libraryApi from '../services/api/library';
import type { Media } from '../services/api/types';

const CACHE_KEY = 'sma.library.cache.v1';
const CACHE_META_KEY = 'sma.library.cache-meta.v1';

type LibraryState = {
  items: Media[];
  isLoading: boolean;
  /** True once the on-disk cache has been read into `items`, so screens don't flash empty before it lands. */
  hydrated: boolean;
  /** True when the last refresh() attempt failed to reach the network/API — `items` is whatever was cached. */
  isStale: boolean;
  /** ISO timestamp for the last successful server refresh, persisted with the cache. */
  lastUpdatedAt: string | null;
  hydrate: () => Promise<void>;
  /** Refreshes the canonical, unfiltered account library. Query-specific
   * results belong to their requesting screen and must never replace this
   * shared collection or its offline cache. */
  refresh: () => Promise<void>;
  upsert: (media: Media) => void;
  remove: (mediaId: string) => Promise<void>;
  resetSession: () => Promise<void>;
};

async function persist(items: Media[]) {
  try {
    // `items` is always the canonical unfiltered library.
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch {
    // Best-effort: offline browsing is a nicety, never let it break a live refresh.
  }
}

async function persistRefreshTime(lastUpdatedAt: string) {
  try {
    await AsyncStorage.setItem(CACHE_META_KEY, lastUpdatedAt);
  } catch {
    // The live result is still valid even if cache metadata cannot be written.
  }
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  isLoading: false,
  hydrated: false,
  isStale: false,
  lastUpdatedAt: null,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const [raw, lastUpdatedAt] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_META_KEY),
      ]);
      if (raw) set({ items: JSON.parse(raw) as Media[] });
      if (lastUpdatedAt) set({ lastUpdatedAt });
    } finally {
      set({ hydrated: true });
    }
  },

  async refresh() {
    set({ isLoading: true });
    try {
      const items = await libraryApi.listLibrary();
      const lastUpdatedAt = new Date().toISOString();
      set({ items, isStale: false, lastUpdatedAt });
      void persist(items);
      void persistRefreshTime(lastUpdatedAt);
    } catch (error) {
      // Network/API unreachable — keep whatever's already loaded (live or cached) and flag it as stale
      // rather than clearing the library, which is what made it look "empty" offline before.
      set({ isStale: true });
      if (!get().hydrated) await get().hydrate();
    } finally {
      set({ isLoading: false });
    }
  },

  upsert(media) {
    const existing = get().items;
    const index = existing.findIndex((item) => item.id === media.id);
    const items = index === -1 ? [media, ...existing] : existing.map((item) => (item.id === media.id ? media : item));
    set({ items });
    void persist(items);
  },

  async remove(mediaId) {
    await libraryApi.deleteMedia(mediaId);
    const items = get().items.filter((item) => item.id !== mediaId);
    set({ items });
    void persist(items);
  },

  async resetSession() {
    set({ items: [], isLoading: false, hydrated: false, isStale: false, lastUpdatedAt: null });
    try {
      await Promise.all([AsyncStorage.removeItem(CACHE_KEY), AsyncStorage.removeItem(CACHE_META_KEY)]);
    } catch {
      // In-memory account data is already gone; storage cleanup is best-effort.
    }
  },
}));
