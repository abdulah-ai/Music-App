import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography } from '../../theme/tokens';
import { Button } from './Button';
import { Reveal } from './Reveal';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyState({
  title,
  subtitle,
  icon = 'musical-notes-outline',
  actionLabel,
  onAction,
  compact = false,
}: Props) {
  return (
    <Reveal distance={compact ? 4 : 8} style={styles.reveal}>
      <View style={[styles.wrap, compact && styles.compact]}>
        <View style={[styles.iconWell, compact && styles.compactIcon]}>
          <View pointerEvents="none" style={styles.iconGlow} />
          <Ionicons name={icon} size={compact ? 22 : 26} color={colors.cyan} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" style={styles.action} /> : null}
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  reveal: { width: '100%' },
  wrap: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  compact: { paddingVertical: spacing.lg },
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(99,214,181,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99,214,181,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(99,214,181,0.10)',
    transform: [{ scale: 1.55 }],
  },
  compactIcon: { width: 52, height: 52, borderRadius: radii.md },
  copy: { width: '100%', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.subtitle, color: colors.textPrimary, textAlign: 'center', maxWidth: 320 },
  subtitle: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: { minWidth: 160, marginTop: spacing.xs },
});
