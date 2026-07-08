import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUiStore } from '../../store/uiStore';
import { spacing } from '../../theme/tokens';
import { AppSidebar } from './AppSidebar';

const PANEL_MAX = 320;

/**
 * Mobile drawer chrome — backdrop + slide animation only. The content inside
 * is <AppSidebar variant="drawer" />, the exact same sidebar the desktop
 * rail renders persistently. There is no second, differently-organised nav
 * surface anywhere in the app.
 */
export function Sidebar() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

  const panelWidth = Math.min(PANEL_MAX, width * 0.82);
  const slide = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      setRendered(true);
      Animated.timing(slide, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [sidebarOpen, slide]);

  if (!rendered) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: slide }]}>
        <Pressable style={styles.backdrop} onPress={closeSidebar} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }],
          },
        ]}
      >
        <BlurView
          tint="dark"
          intensity={80}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.panelOverlay} />
        <View style={styles.panelContent}>
          <AppSidebar variant="drawer" onNavigate={closeSidebar} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,5,3,0.6)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
  },
  panelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,15,13,0.86)',
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
});
