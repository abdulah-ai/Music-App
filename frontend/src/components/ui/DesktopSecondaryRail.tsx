import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RAIL_WIDTH, useResponsive } from '../../hooks/useResponsive';
import { navigationRef } from '../../navigation/navigationRef';
import { spacing } from '../../theme/tokens';
import { AppSidebar } from './AppSidebar';

/**
 * The desktop rail lives inside MainTabs as its tab bar, so it disappears the
 * moment a full-screen route (Settings, Telegram, Replay, Admin…) is pushed on
 * top. This mirror renders the exact same <AppSidebar variant="rail" /> for
 * those secondary routes so the navigation never vanishes on desktop — one
 * consistent sidebar everywhere. It is inert on phones (the drawer handles
 * those) and never shows over the immersive Player modal or the tab shell,
 * both of which already own their own chrome.
 */
const RAIL_ROUTES = new Set(['Settings', 'Telegram', 'Jobs', 'Replay', 'Admin']);

export function DesktopSecondaryRail() {
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();
  const [routeName, setRouteName] = useState<string | undefined>(() =>
    navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined,
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let raf = 0;
    const attach = () => {
      if (!navigationRef.isReady()) {
        raf = requestAnimationFrame(attach);
        return;
      }
      const update = () => setRouteName(navigationRef.getCurrentRoute()?.name);
      update();
      unsubscribe = navigationRef.addListener('state', update);
    };
    attach();
    return () => {
      if (unsubscribe) unsubscribe();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!isDesktop || !routeName || !RAIL_ROUTES.has(routeName)) return null;

  return (
    <View style={[styles.rail, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.railOverlay} />
      <AppSidebar variant="rail" />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: RAIL_WIDTH,
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderRightColor: 'rgba(158,181,170,0.12)',
    overflow: 'hidden',
  },
  railOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: 'rgba(5,10,11,0.9)',
  },
});
