import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, glass, glassBlur, iconography, radii, shadows, spacing, typography } from '../../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityHint?: string;
  testID?: string;
};

/** A bright mint for text sitting on the teal-tinted primary glass pane. */
const PRIMARY_LABEL = '#E9FFF6';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
  accessibilityHint,
  testID,
}: Props) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={loading ? `${label}, in progress` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        glassBlur,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        isDanger && styles.danger,
        pressed && !isDisabled && styles.pressed,
        isDisabled && isPrimary && styles.disabledPrimary,
        isDisabled && variant === 'secondary' && styles.disabledSecondary,
        isDisabled && variant === 'ghost' && styles.disabledGhost,
        isDisabled && isDanger && styles.disabledDanger,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={isDanger ? colors.danger : colors.cyan} />
        ) : icon ? (
          <Ionicons
            name={icon}
            size={iconography.size.md}
            color={isDisabled ? colors.textMuted : isPrimary ? colors.cyan : isDanger ? colors.danger : colors.textPrimary}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            isPrimary && !isDisabled && styles.primaryLabel,
            isDanger && !isDisabled && styles.dangerLabel,
            isDisabled && !loading && styles.disabledLabel,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.control,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  // Every variant is a glass pane: translucent tint + luminous stroke, with
  // the shared backdrop blur applied inline so the sky reflects through.
  primary: {
    backgroundColor: glass.tintPrimary,
    borderColor: glass.tintPrimaryStroke,
    ...shadows.low,
  },
  secondary: {
    backgroundColor: glass.fillBright,
    borderColor: glass.strokeStrong,
  },
  ghost: {
    backgroundColor: glass.fillDeep,
    borderColor: glass.stroke,
  },
  danger: {
    backgroundColor: glass.tintDanger,
    borderColor: glass.tintDangerStroke,
  },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  disabledPrimary: {
    backgroundColor: glass.fillDeep,
    borderColor: glass.stroke,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledSecondary: {
    backgroundColor: glass.fillDeep,
    borderColor: glass.stroke,
  },
  disabledGhost: {
    borderColor: glass.stroke,
  },
  disabledDanger: {
    backgroundColor: 'rgba(240,131,140,0.05)',
    borderColor: 'rgba(240,131,140,0.14)',
  },
  content: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: iconography.labelGap.standard,
  },
  label: { ...typography.subtitle, fontSize: 15, color: colors.textPrimary, textAlign: 'center' },
  primaryLabel: { color: PRIMARY_LABEL },
  dangerLabel: { color: colors.danger },
  disabledLabel: { color: colors.textMuted },
});
