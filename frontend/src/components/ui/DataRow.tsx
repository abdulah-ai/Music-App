import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, iconography, numericTypography, radii, spacing, typography } from '../../theme/tokens';
import { glass, motion } from '../../theme/tokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { GlassPanel } from './GlassPanel';

export type DataRowTone = 'neutral' | 'active' | 'success' | 'attention';

type Props = {
  title: string;
  status: { label: string; tone: DataRowTone };
  icon?: keyof typeof Ionicons.glyphMap;
  leading?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  metaTone?: 'muted' | 'attention';
  metaNumberOfLines?: number;
  timestamp?: string;
  trailingAction?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const TONE_COLOR: Record<DataRowTone, string> = {
  neutral: colors.textMuted,
  active: colors.cyan,
  success: colors.success,
  attention: colors.danger,
};

function textNode(value: ReactNode, style: StyleProp<TextStyle>, numberOfLines = 1) {
  if (typeof value === 'string' || typeof value === 'number') {
    return <Text numberOfLines={numberOfLines} style={style}>{value}</Text>;
  }
  return <View style={styles.nodeSlot}>{value}</View>;
}

/** Shared hierarchy for operational rows with status, metadata, time and actions. */
export function DataRow({
  title,
  status,
  icon,
  leading,
  subtitle,
  meta,
  metaTone = 'muted',
  metaNumberOfLines = 1,
  timestamp,
  trailingAction,
  style,
}: Props) {
  const toneColor = TONE_COLOR[status.tone];
  const reduceMotion = useReducedMotion();
  const previousTone = useRef(status.tone);
  const sweep = useRef(new Animated.Value(0)).current;
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    const completedNow = status.tone === 'success' && previousTone.current !== 'success';
    previousTone.current = status.tone;
    sweep.stopAnimation();
    if (!completedNow || reduceMotion) {
      sweep.setValue(0);
      return;
    }
    sweep.setValue(0);
    Animated.sequence([
      Animated.delay(motion.duration.base + motion.duration.fast),
      Animated.timing(sweep, {
        toValue: 1,
        duration: motion.duration.slow,
        easing: Easing.bezier(...motion.easing.decelerate),
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, status.tone, sweep]);

  return (
    <GlassPanel
      onLayout={(event) => setRowWidth(Math.ceil(event.nativeEvent.layout.width))}
      style={[styles.panel, status.tone === 'attention' && styles.panelFailure, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.completionSweep,
          {
            width: Math.max(80, rowWidth * 0.42),
            opacity: sweep.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.18, 0] }),
            transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-Math.max(80, rowWidth * 0.42), rowWidth] }) }],
          },
        ]}
      />
      <View pointerEvents="none" style={[styles.accent, { backgroundColor: toneColor }]} />
      <View style={styles.content}>
        {leading ? (
          <View style={styles.leading}>{leading}</View>
        ) : icon ? (
          <View style={[styles.iconWell, { borderColor: toneColor }]}>
            <Ionicons name={icon} size={iconography.size.md} color={toneColor} />
          </View>
        ) : null}

        <View style={styles.copy}>
          <View style={styles.statusRow}>
            <View style={[styles.statusChip, { borderColor: toneColor }]}>
              <Text numberOfLines={1} style={[styles.statusLabel, { color: toneColor }]}>{status.label}</Text>
            </View>
            {timestamp ? <Text numberOfLines={1} style={styles.timestamp}>{timestamp}</Text> : null}
          </View>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          {subtitle != null ? textNode(subtitle, styles.subtitle) : null}
          {meta != null
            ? textNode(meta, [styles.meta, metaTone === 'attention' && styles.metaAttention], metaNumberOfLines)
            : null}
        </View>

        {trailingAction ? <View style={styles.trailing}>{trailingAction}</View> : null}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radii.lg, overflow: 'hidden' },
  panelFailure: { borderColor: colors.danger },
  completionSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: glass.tintPrimary,
  },
  accent: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 4 },
  content: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md + spacing.xs,
    paddingRight: spacing.md,
  },
  leading: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  iconWell: {
    width: iconography.well.standard,
    height: iconography.well.standard,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  statusRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.subtitle, fontSize: 15, color: colors.textPrimary },
  statusChip: {
    minHeight: 24,
    maxWidth: 132,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  statusLabel: { ...typography.caption, fontFamily: 'Sora_600SemiBold', fontSize: 10, lineHeight: 14 },
  timestamp: { ...numericTypography.time, flex: 1, fontSize: 10, lineHeight: 14, color: colors.textMuted },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  meta: { ...typography.caption, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  metaAttention: { color: colors.danger },
  nodeSlot: { alignSelf: 'stretch' },
  trailing: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
