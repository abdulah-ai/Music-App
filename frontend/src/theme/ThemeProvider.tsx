import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { reloadAppAsync } from 'expo';

import { WEB_THEME_MIRROR_KEY, useThemeStore, type ThemePreference } from '../store/themeStore';
import { applyWebTheme, literalThemes, type ThemeScheme } from './theme';

type ThemeContextValue = {
  preference: ThemePreference;
  scheme: ThemeScheme;
  theme: (typeof literalThemes)[ThemeScheme];
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function resolveTheme(preference: ThemePreference, systemScheme: string | null | undefined): ThemeScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'light' ? 'light' : 'dark';
}

export function getInitialWebTheme(): ThemeScheme {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'dark';
  const preference = (localStorage.getItem(WEB_THEME_MIRROR_KEY) ?? 'system') as ThemePreference;
  return resolveTheme(preference, window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const hydrated = useThemeStore((state) => state.hydrated);
  const hydrate = useThemeStore((state) => state.hydrate);
  const persistPreference = useThemeStore((state) => state.setPreference);
  const scheme = resolveTheme(preference, systemScheme);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    applyWebTheme(scheme);
  }, [scheme]);

  // Static StyleSheets are evaluated when their modules load. On native we
  // select the correct literal token set at that moment; changing an explicit
  // preference therefore refreshes the JS bundle after updating Appearance.
  // This is a full native theme path, not a web-only CSS-variable fallback.
  useEffect(() => {
    if (Platform.OS === 'web' || !hydrated || preference === 'system') return;
    if (Appearance.getColorScheme() !== preference) {
      Appearance.setColorScheme(preference);
      void reloadAppAsync('Apply Starhollow appearance');
    }
  }, [hydrated, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    persistPreference(next);
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
      void reloadAppAsync('Change Starhollow appearance');
    }
  }, [persistPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, scheme, theme: literalThemes[scheme], setPreference }),
    [preference, scheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
