import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, glass, glassBlur, iconography } from '../../theme/tokens';
import { useTactileGlass } from '../../hooks/useTactileGlass';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: PressableProps['onPress'];
  accessibilityHint?: string;
  variant?: 'ghost' | 'surface' | 'primary' | 'danger';
  selected?: boolean;
  disabled?: boolean;
  size?: number;
  iconSize?: number;
  hitSlop?: PressableProps['hitSlop'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function IconButton({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  variant = 'ghost',
  selected = false,
  disabled = false,
  size = iconography.well.standard,
  iconSize = iconography.size.md,
  hitSlop,
  style,
  testID,
}: Props) {
  const tone = variant === 'danger' ? colors.danger : variant === 'primary' ? colors.cyan : selected ? colors.cyan : colors.textSecondary;
  const tactile = useTactileGlass({ disabled });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      onPressIn={tactile.onPressIn}
      onPressOut={tactile.onPressOut}
      onHoverIn={tactile.onHoverIn}
      onHoverOut={tactile.onHoverOut}
      style={[
        styles.base,
        glassBlur,
        {
          width: Math.max(iconography.well.standard, size),
          height: Math.max(iconography.well.standard, size),
          borderRadius: Math.max(iconography.well.standard, size) / 2,
        },
        variant === 'surface' && styles.surface,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        selected && variant !== 'primary' && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View style={{ opacity: tactile.highlight, transform: [{ scale: tactile.scale }] }}>
        <Ionicons name={icon} size={iconSize} color={tone} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.hoverBorder, { opacity: tactile.hoverBorder }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Even the quiet ghost variant is a faint pane of glass, so every control
  // catches the starfield behind it.
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fillDeep,
  },
  surface: { backgroundColor: glass.fillBright, borderColor: glass.strokeStrong },
  primary: { backgroundColor: glass.tintPrimary, borderColor: glass.tintPrimaryStroke },
  danger: { backgroundColor: glass.tintDanger, borderColor: glass.tintDangerStroke },
  selected: { backgroundColor: glass.tintPrimary, borderColor: glass.tintPrimaryStroke },
  hoverBorder: { ...(StyleSheet.absoluteFill as object), borderRadius: 999, borderWidth: 1, borderColor: glass.edgeModal },
  disabled: { opacity: 0.4 },
});
