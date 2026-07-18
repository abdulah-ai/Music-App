import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, glass, radii, spacing, typography } from '../../theme/tokens';

function lastUpdatedLabel(value: string | null): string {
  if (!value) return 'Last successful update is unknown.';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Last successful update is unknown.';
  return `Last updated ${date.toLocaleString()}.`;
}

export function LibraryFreshnessBanner({
  stale,
  lastUpdatedAt,
  refreshing,
  onRetry,
}: {
  stale: boolean;
  lastUpdatedAt: string | null;
  refreshing: boolean;
  onRetry: () => void;
}) {
  if (!stale) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.banner}
    >
      <View style={styles.iconWell}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Showing your saved library</Text>
        <Text style={styles.detail}>Couldn’t reach Star Hollow. {lastUpdatedLabel(lastUpdatedAt)}</Text>
      </View>
      <Pressable
        onPress={onRetry}
        disabled={refreshing}
        accessibilityRole="button"
        accessibilityLabel="Retry library refresh"
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed, refreshing && styles.retryDisabled]}
      >
        {refreshing ? <ActivityIndicator size="small" color={colors.cyan} /> : <Ionicons name="refresh" size={16} color={colors.cyan} />}
        <Text style={styles.retryLabel}>{refreshing ? 'Retrying' : 'Retry'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: glass.fillHeavy,
  },
  iconWell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: glass.fillBright,
  },
  copy: { flex: 1, minWidth: 180 },
  title: { ...typography.subtitle, fontSize: 13, color: colors.textPrimary },
  detail: { ...typography.caption, color: colors.textMuted },
  retry: {
    minWidth: 88,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: glass.fillBright,
  },
  retryPressed: { backgroundColor: glass.tintPrimary },
  retryDisabled: { opacity: 0.65 },
  retryLabel: { ...typography.subtitle, fontSize: 12, color: colors.cyan },
});
