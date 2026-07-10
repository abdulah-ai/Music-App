import { gradients, layout, palette, typeScale } from './theme';

/**
 * Legacy token surface, remapped onto the "Duskglen" design system in
 * `theme.ts`. Existing components keep importing the same names and pick up
 * the new palette for free.
 */
export const colors = {
  bg: palette.background,
  bgElevated: palette.surface,
  surface: palette.surface,
  surfaceBright: palette.surfaceBright,
  surfaceBorder: 'rgba(174,165,192,0.10)',
  textPrimary: palette.textPrimary,
  textSecondary: palette.textSecondary,
  textMuted: palette.textMuted,

  // Accent slots: `violet` carries the twilight-lavender secondary accent and
  // `cyan` the ember-coral primary accent, so old call sites stay on-palette.
  violet: palette.secondary,
  cyan: palette.primary,
  gold: palette.gold,
  pink: '#E88AB8',
  coral: palette.danger,

  success: palette.success,
  danger: palette.danger,

  gradientPrimary: gradients.accent,
  gradientHero: gradients.heroCard,
  gradientIdleScreen: gradients.screenIdle,
  gradientListeningScreen: gradients.screenListening,
  gradientWarm: [palette.gold, palette.danger] as const,
  gradientOrb: [palette.primary, palette.secondary, palette.gold] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: layout.screenPadding, // 20 — generous main-container padding
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: layout.radiusCover, // 10 — cover art, deliberately sharper than cards
  md: layout.radiusControl, // 14 — buttons, inputs
  lg: layout.radius, // 20 — cards
  pill: 999,
} as const;

export const typography = {
  mega: typeScale.mega,
  display: typeScale.hero,
  title: typeScale.heading,
  eyebrow: typeScale.eyebrow,
  subtitle: { fontFamily: 'Sora_500Medium', fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: 'System', fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: 'System', fontSize: 13, lineHeight: 18 },
} as const;

export { gradients, layout, shadows, motion } from './theme';

export { Sora_500Medium, Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
