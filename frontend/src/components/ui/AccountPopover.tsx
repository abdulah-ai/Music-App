import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import { RAIL_WIDTH } from '../../hooks/useResponsive';
import { navigationRef } from '../../navigation/navigationRef';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { colors, glass, motion, radii, spacing, typography } from '../../theme/tokens';
import { GlassPanel } from './GlassPanel';

function initialReducedMotion() {
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    : false;
}

export function AccountPopover() {
  const open = useUiStore((state) => state.accountMenuOpen);
  const close = useUiStore((state) => state.closeAccountMenu);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [rendered, setRendered] = useState(open);
  const [reducedMotion, setReducedMotion] = useState(initialReducedMotion);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEscapeToClose(open, close);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (alive) setReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (open) setRendered(true);

    if (reducedMotion) {
      progress.setValue(open ? 1 : 0);
      if (!open) setRendered(false);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? motion.duration.base : motion.duration.fast,
      easing: open
        ? Easing.bezier(...motion.easing.decelerate)
        : Easing.bezier(...motion.easing.accelerate),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) setRendered(false);
    });
    return () => animation.stop();
  }, [open, progress, reducedMotion]);

  if (!rendered) return null;

  function navigate(route: 'Settings' | 'Replay') {
    close();
    if (navigationRef.isReady()) navigationRef.navigate(route);
  }

  return (
    <>
      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close account menu"
        />
      </Animated.View>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[
          styles.cardPosition,
          {
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
            ],
          },
        ]}
        accessibilityViewIsModal
      >
        <GlassPanel style={styles.card} overlayColor={glass.fillHeavy}>
          <View style={styles.header}>
            <Text numberOfLines={1} style={styles.name}>
              {user?.display_name ?? 'Listener'}
            </Text>
            <Text numberOfLines={1} style={styles.email}>
              {user?.email ?? ''}
            </Text>
          </View>
          <Pressable
            onPress={() => navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.rowLabel}>Settings</Text>
          </Pressable>
          <Pressable
            onPress={() => navigate('Replay')}
            accessibilityRole="button"
            accessibilityLabel="Replay"
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Ionicons name="sparkles-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.rowLabel}>Replay</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              close();
              void logout();
            }}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => [styles.row, styles.signOutRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={[styles.rowLabel, styles.signOutLabel]}>Sign out</Text>
          </Pressable>
        </GlassPanel>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...(StyleSheet.absoluteFill as object) },
  cardPosition: {
    position: 'absolute',
    left: spacing.lg,
    bottom: 88,
    width: RAIL_WIDTH - spacing.lg * 2,
  },
  card: {
    borderRadius: radii.lg,
    borderColor: glass.strokeStrong,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: glass.stroke,
    marginBottom: spacing.xs,
  },
  name: { ...typography.subtitle, fontSize: 14, color: colors.textPrimary },
  email: { ...typography.caption, fontSize: 11, color: colors.textMuted },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  rowPressed: { backgroundColor: glass.fillBright },
  rowLabel: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  signOutRow: { marginBottom: spacing.xs },
  signOutLabel: { color: colors.danger },
});
