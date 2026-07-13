import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'sh.theme.v1';
export const WEB_THEME_MIRROR_KEY = 'sh.theme.preference.v1';

function normalizePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

type ThemeState = {
  hydrated: boolean;
  preference: ThemePreference;
  hydrate: () => Promise<void>;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  hydrated: false,
  preference: 'system',

  async hydrate() {
    try {
      const mirrored =
        Platform.OS === 'web' && typeof localStorage !== 'undefined'
          ? localStorage.getItem(WEB_THEME_MIRROR_KEY)
          : null;
      const raw = mirrored ?? (await AsyncStorage.getItem(STORAGE_KEY));
      set({ preference: normalizePreference(raw) });
    } finally {
      set({ hydrated: true });
    }
  },

  setPreference(preference) {
    set({ preference });
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(WEB_THEME_MIRROR_KEY, preference);
    }
    void AsyncStorage.setItem(STORAGE_KEY, preference);
  },
}));
