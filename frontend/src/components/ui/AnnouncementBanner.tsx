import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLatestAnnouncement } from '../../hooks/useAnnouncements';
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';

/** Global "the admin posted something" banner — same pattern as UpdateBanner. */
export function AnnouncementBanner() {
  const { announcement, dismiss } = useLatestAnnouncement();
  const insets = useSafeAreaInsets();

  if (!announcement) return null;

  return (
    <View pointerEvents="box-none" style={[styles.holder, { top: insets.top + spacing.sm }]}>
      <View pointerEvents="auto" style={styles.card}>
        <Ionicons name="megaphone" size={18} color={colors.cyan} />
        <View style={styles.textCol}>
          <Text style={styles.title}>{announcement.title}</Text>
          <Text numberOfLines={3} style={styles.detail}>
            {announcement.body}
          </Text>
        </View>
        <Pressable onPress={dismiss} accessibilityLabel="Dismiss announcement" style={styles.dismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 1090,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(27,20,38,0.96)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,138,92,0.3)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 460,
    ...shadows.card,
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  title: {
    ...typography.body,
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    color: colors.textPrimary,
  },
  detail: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  dismiss: {
    padding: 2,
  },
});
