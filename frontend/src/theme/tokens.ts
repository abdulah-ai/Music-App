import { Platform, type ViewStyle } from 'react-native';

import { glass, gradients, layout, palette, typeScale } from './theme';

/**
 * Backdrop blur for glass panes. Real CSS backdrop-filter on web — which is
 * what the shipped APK runs, inside its Capacitor WebView — and a no-op on
 * native, where the translucent glass fills still read correctly on their own.
 * Spread inline (`style={[styles.x, glassBlur]}`), never inside
 * StyleSheet.create, so native style validation never sees the web-only keys.
 */
export const glassBlur: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
      } as unknown as ViewStyle)
    : {};

export { glass };

/** Compatibility surface used throughout the app. New work should still use
 * these semantic names so palette changes remain centralized. */
export const colors = {
  bg: palette.background,
  bgElevated: palette.surface,
  surface: palette.surface,
  surfaceBright: palette.surfaceBright,
  surfaceElevated: palette.surfaceElevated,
  surfaceBorder: palette.border,
  surfaceBorderStrong: palette.borderStrong,
  textPrimary: palette.textPrimary,
  textSecondary: palette.textSecondary,
  textMuted: palette.textMuted,
  textInverse: palette.textInverse,

  violet: palette.secondary,
  cyan: palette.primary,
  gold: palette.gold,
  pink: '#DBA3BC',
  coral: palette.danger,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,

  gradientPrimary: gradients.accent,
  gradientHero: gradients.heroCard,
  gradientIdleScreen: gradients.screenIdle,
  gradientListeningScreen: gradients.screenListening,
  gradientWarm: [palette.gold, palette.primary] as const,
  gradientOrb: [palette.primary, '#8FE3C8', palette.gold] as const,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: layout.screenPadding,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  xs: 6,
  sm: layout.radiusCover,
  md: layout.radiusControl,
  lg: layout.radius,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  mega: typeScale.mega,
  display: typeScale.hero,
  title: typeScale.heading,
  eyebrow: typeScale.eyebrow,
  subtitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: 'Sora_400Regular',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  caption: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
} as const;

export { gradients, layout, shadows, motion } from './theme';
export { Sora_400Regular } from '@expo-google-fonts/sora/400Regular';
export { Sora_500Medium } from '@expo-google-fonts/sora/500Medium';
export { Sora_600SemiBold } from '@expo-google-fonts/sora/600SemiBold';
export { Sora_700Bold } from '@expo-google-fonts/sora/700Bold';
