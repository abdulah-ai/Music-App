import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

import { RippleField } from './RippleField';
import { GlassPanel } from './GlassPanel';
import { GradientText } from './GradientText';
import { Reveal } from './Reveal';
import { Starwell } from '../scene/Starwell';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, radii, spacing, typography } from '../../theme/tokens';

type Feature = { icon: keyof typeof Ionicons.glyphMap; label: string };

const FEATURES: Feature[] = [
  { icon: 'cloud-download-outline', label: 'Save audio & video from any link' },
  { icon: 'mic-outline', label: 'Name any song playing around you' },
  { icon: 'shield-checkmark-outline', label: 'A private collection that stays yours' },
];

type Props = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
}>;

/**
 * Shared auth shell. Phones get the familiar stacked column; desktop gets a
 * split hero — living orb, oversized headline and feature list on the left,
 * the glass form floating on the right.
 */
export function AuthLayout({ eyebrow, title, subtitle, children }: Props) {
  const { isDesktop, height } = useResponsive();
  // Login/Register both stay mounted in the auth stack — only render the
  // ambient background + 3D moon for whichever one is actually on screen.
  const isFocused = useIsFocused();

  if (!isDesktop) {
    return (
      <View style={styles.root}>
        {isFocused && <RippleField />}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mobileScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Reveal resetKey={isFocused}>
            <View style={styles.mobileMasthead}>
              <View pointerEvents="none" style={styles.mobileHorizon} />
              <View style={styles.mobileOrb}>
                {isFocused && <Starwell state="idle" size={112} />}
              </View>
              <View style={styles.mobilePromise}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <GradientText style={styles.mobileTitle}>{title}</GradientText>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
            </View>
          </Reveal>
          <Reveal delay={100} resetKey={isFocused}>
            <GlassPanel>
              <View style={styles.form}>{children}</View>
            </GlassPanel>
          </Reveal>
          {/* Phones are the primary install — first-timers deserve the same
              "what is this app" pitch the desktop hero shows. */}
          <Reveal delay={200} resetKey={isFocused}>
            <View style={styles.mobileFeatureList}>
              <View style={styles.mobileFeatureHeading}>
                <View style={styles.mobileFeatureRule} />
                <Text style={styles.mobileFeatureEyebrow}>YOUR PRIVATE HOLLOW</Text>
                <View style={styles.mobileFeatureRule} />
              </View>
              {FEATURES.map((feature) => (
                <View key={feature.icon} style={styles.mobileFeatureRow}>
                  <Ionicons name={feature.icon} size={15} color={colors.cyan} />
                  <Text style={styles.mobileFeatureLabel}>{feature.label}</Text>
                </View>
              ))}
            </View>
          </Reveal>
        </ScrollView>
      </View>
    );
  }

  const roomy = height >= 760;

  return (
    <View style={styles.root}>
      {isFocused && <RippleField />}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.desktopScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.split}>
          <Reveal style={styles.heroCol} resetKey={isFocused}>
            <View style={styles.posterHeader}>
              <View style={styles.heroOrbRow}>
                {isFocused && <Starwell state="idle" size={roomy ? 196 : 152} />}
              </View>
              <View style={styles.posterIndex}>
                <Text style={styles.posterIndexTop}>PRIVATE MUSIC ARCHIVE</Text>
                <Text style={styles.posterIndexNumber}>01</Text>
              </View>
            </View>
            <Text style={[styles.eyebrow, styles.heroEyebrow]}>{eyebrow}</Text>
            <GradientText style={styles.heroTitle}>{title}</GradientText>
            <Text style={[styles.subtitle, styles.heroSubtitle]}>{subtitle}</Text>
            <View style={styles.featureList}>
              {FEATURES.map((feature, index) => (
                <View key={feature.icon} style={styles.featureRow}>
                  <Text style={styles.featureIndex}>0{index + 1}</Text>
                  <View style={styles.featureIcon}>
                    <Ionicons name={feature.icon} size={16} color={colors.cyan} />
                  </View>
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                </View>
              ))}
            </View>
          </Reveal>

          <Reveal delay={120} style={styles.formCol} resetKey={isFocused}>
            <GlassPanel intensity={80} overlayColor="rgba(9,17,25,0.68)" edgeColor="rgba(99,214,181,0.34)">
              <View style={[styles.form, styles.formDesktop]}>{children}</View>
            </GlassPanel>
          </Reveal>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },

  // ----- Mobile -----
  mobileScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  mobileMasthead: {
    position: 'relative',
    minHeight: 238,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  mobileHorizon: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: 58,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(99,214,181,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(169,155,219,0.08)',
    transform: [{ scaleX: 1.45 }],
  },
  mobileOrb: { position: 'absolute', top: -4, left: 0, right: 0, alignItems: 'center' },
  mobilePromise: { alignItems: 'center' },
  mobileTitle: { ...typography.mega, fontSize: 34, lineHeight: 40, textAlign: 'center' },
  mobileFeatureList: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  mobileFeatureHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  mobileFeatureRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.surfaceBorder },
  mobileFeatureEyebrow: { ...typography.eyebrow, fontSize: 8, color: colors.textMuted },
  mobileFeatureRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mobileFeatureLabel: { ...typography.caption, color: colors.textSecondary },

  // ----- Shared -----
  eyebrow: { ...typography.eyebrow, color: colors.cyan, textAlign: 'center', marginBottom: spacing.xs },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  form: { padding: spacing.lg, gap: spacing.md },

  // ----- Desktop -----
  desktopScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 84,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  heroCol: { flex: 1, maxWidth: 590 },
  posterHeader: { minHeight: 184, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroOrbRow: { alignItems: 'flex-start', marginLeft: -spacing.lg },
  posterIndex: { alignItems: 'flex-end', gap: spacing.xs, paddingTop: spacing.md },
  posterIndexTop: { ...typography.eyebrow, fontSize: 8, color: colors.textMuted },
  posterIndexNumber: { ...typography.numeric, fontSize: 28, lineHeight: 32, color: colors.surfaceBorderStrong },
  heroTitle: {
    ...typography.mega,
    fontSize: 62,
    lineHeight: 66,
    letterSpacing: -2.4,
    textAlign: 'left',
    maxWidth: 560,
  },
  heroSubtitle: {
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.xxl,
    maxWidth: 460,
  },
  featureList: { borderTopWidth: 1, borderTopColor: colors.surfaceBorder, paddingTop: spacing.sm },
  featureRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceBorder,
  },
  featureIndex: { ...typography.numeric, width: 24, fontSize: 10, color: colors.textMuted },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(99,214,181,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99,214,181,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: { ...typography.body, color: colors.textSecondary },
  formCol: { width: 390 },
  formDesktop: { padding: spacing.xl, gap: spacing.md },
  heroEyebrow: { textAlign: 'left' },
});
