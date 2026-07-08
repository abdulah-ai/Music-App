import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppUpdate } from '../../hooks/useAppUpdate';
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';

/**
 * Global "a new version is ready" banner — rendered once at the app root
 * (see RootNavigator), same pattern as Sidebar/AccountPopover. Persists
 * until the user acts or dismisses it; dismissal is keyed by update id so a
 * later, genuinely newer release still prompts even if an older one was
 * waved away this session.
 */
export function UpdateBanner() {
  const update = useAppUpdate();
  const insets = useSafeAreaInsets();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  if (!update.available || update.id === dismissedId) return null;

  return (
    <View pointerEvents="box-none" style={[styles.holder, { top: insets.top + spacing.sm }]}>
      <View pointerEvents="auto" style={styles.card}>
        <Ionicons name="sparkles" size={18} color={colors.cyan} />
        <View style={styles.textCol}>
          <Text style={styles.title}>{update.title}</Text>
          <Text style={styles.detail}>{update.detail}</Text>
        </View>
        <Pressable onPress={update.apply} style={styles.actionButton} hitSlop={8}>
          <Text style={styles.actionText}>{update.actionLabel}</Text>
        </Pressable>
        <Pressable onPress={() => setDismissedId(update.id)} style={styles.dismiss} hitSlop={8}>
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
    zIndex: 1100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(18,28,24,0.96)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(47,191,170,0.3)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 460,
    ...shadows.card,
  },
  textCol: {
    flexShrink: 1,
    gap: 1,
  },
  title: {
    ...typography.body,
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    color: colors.textPrimary,
  },
  detail: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  actionButton: {
    backgroundColor: colors.cyan,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 12,
    color: '#0A0F0D',
  },
  dismiss: {
    padding: 2,
  },
});
