/**
 * "Duskglen" design system — the single source of truth for the app's look.
 *
 * Visual concept: the glen at true dusk — the minute after the sun slips
 * below the treeline. An ink-violet night sky deepening overhead; the last
 * ember of sunset burning low on the horizon. Ember-coral is the signal
 * accent (interactive, alive, warm); twilight lavender is the secondary
 * (the sky itself, links, quiet highlights); star-gold stays reserved for
 * genuinely premium moments (Sanctuary Mode, starred items, fireflies) —
 * not a UI colour, a highlight.
 */

export const palette = {
  /** Global app background — ink violet, a hair warmer than pure black. */
  background: '#100B18',
  /** Deepest background, behind ambient washes. */
  void: '#09060F',
  /** Cards, sheets and other raised containers — deep dusk plum. */
  surface: '#1B1426',
  /** A slightly brighter surface for pressed / highlighted states. */
  surfaceBright: '#281E38',
  /** Primary accent — ember coral, the last light of the sun. Interactive elements, progress, glow. */
  primary: '#FF8A5C',
  /** Secondary accent — twilight lavender. Secondary highlights, links. */
  secondary: '#B39DFF',
  /** Rare premium accent — star gold. Sanctuary Mode, favourites, badges only. */
  gold: '#E8C468',
  /** Primary copy — moonlit lavender-white. */
  textPrimary: '#F1EDF7',
  /** Secondary copy on dark surfaces. */
  textSecondary: '#AEA5C0',
  /** De-emphasised copy: captions, metadata, placeholders. */
  textMuted: '#746C86',

  success: '#5FBF8E',
  danger: '#E8506E',
} as const;

export const gradients = {
  /** Signature accent sweep: ember coral into twilight lavender. Used sparingly. */
  accent: [palette.primary, palette.secondary] as const,
  /** Full sweep incl. gold — reserved for Sanctuary Mode and one hero moment. */
  aurora: [palette.primary, palette.secondary, palette.gold] as const,
  /** Subtle card wash — barely-lifted dusk plum, no loud colour. */
  heroCard: ['#1B1426', '#221A30', '#1B1426'] as const,
  /** Ambient screen background at rest — deep night overhead sinking into a
   * violet mid-sky, warming into the ember afterglow at the horizon, so the
   * sky has visible depth instead of reading as one flat near-black. */
  screenIdle: ['#09060F', '#150D22', '#2A1526'] as const,
  /** Ambient screen background while the mic is hot — ember drift. */
  screenListening: ['#2A1220', '#1D1128', '#100B18'] as const,
  /** Placeholder cover art wash. */
  coverFallback: ['#221A30', '#1B1426'] as const,
  /** Bottom-of-cover scrim so titles can sit on artwork. */
  coverScrim: ['rgba(9,6,15,0)', 'rgba(9,6,15,0.55)', 'rgba(9,6,15,0.92)'] as const,

  /** Ripple/aurora washes — soft, low-opacity light drifting behind content. */
  rippleSignal: ['rgba(255,138,92,0.15)', 'rgba(255,138,92,0)'] as const,
  rippleWave: ['rgba(179,157,255,0.14)', 'rgba(179,157,255,0)'] as const,
} as const;

export const layout = {
  /** Generous padding for main screen containers. */
  screenPadding: 20,
  /** Cards and sheets — soft, modern, unmistakably rounder than before. */
  radius: 20,
  /** Buttons and inputs — slightly tighter than cards. */
  radiusControl: 14,
  /** Cover art thumbnails — sharper than controls, archival rather than "app icon" round. */
  radiusCover: 10,

  /** Floating glass dock (custom tab bar) geometry. */
  dockHeight: 64,
  dockBottomGap: 12,
  /** How far the raised center scan button pokes above the dock pill. */
  dockScanOverhang: 26,
  /** Vertical space the dock occupies above the safe-area inset. */
  dockClearance: 64 + 12 + 26,

  /** Clearance scroll content needs so it can float up from behind the glass dock + mini player. */
  tabBarClearance: 200,

  /** Sidebar rail width on desktop. */
  sidebarWidth: 248,
} as const;

export const typeScale = {
  /** Oversized editorial headline. */
  mega: {
    fontFamily: 'Sora_700Bold',
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.5,
  },
  /** Large screen headers: big, bold, tracked slightly tight. */
  hero: {
    fontFamily: 'Sora_700Bold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
  },
  heading: {
    fontFamily: 'Sora_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  /** Tiny letterspaced all-caps eyebrow label. */
  eyebrow: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 2.5,
  },
} as const;

export const shadows = {
  /** Soft ambient card shadow — depth without hard lines. */
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  /** Restrained ember glow — reserved for the single active/primary control. */
  glowPrimary: {
    shadowColor: palette.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  /** Rare gold glow — Sanctuary Mode, favourites, premium badges only. */
  glowGold: {
    shadowColor: palette.gold,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;

/** Shared motion timing — every animation should reach for one of these. */
export const motion = {
  duration: {
    fast: 120,
    base: 200,
    slow: 360,
  },
  easing: {
    standard: [0.4, 0, 0.2, 1] as const,
    decelerate: [0, 0, 0.2, 1] as const,
    accelerate: [0.4, 0, 1, 1] as const,
  },
} as const;

export const theme = { palette, gradients, layout, typeScale, shadows, motion } as const;
export default theme;
