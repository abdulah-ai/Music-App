import { PropsWithChildren } from 'react';
import {
  AccessibilityState,
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

import { useTactileGlass } from '../../hooks/useTactileGlass';
import { glass, radii } from '../../theme/tokens';

type Props = PropsWithChildren<{
  onPress?: PressableProps['onPress'];
  onLongPress?: PressableProps['onLongPress'];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hoverScaleTo?: number;
  hitSlop?: PressableProps['hitSlop'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
}>;

/** Accessible 44pt touch target with restrained press feedback. */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  scaleTo = 0.98,
  hoverScaleTo: _hoverScaleTo = 1,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  testID,
}: Props) {
  const tactile = useTactileGlass({ disabled, scaleTo });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      style={styles.hitTarget}
      onPressIn={tactile.onPressIn}
      onPressOut={tactile.onPressOut}
      onHoverIn={tactile.onHoverIn}
      onHoverOut={tactile.onHoverOut}
    >
      <Animated.View style={[style, { opacity: tactile.highlight, transform: [{ scale: tactile.scale }] }, disabled && styles.disabled]}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.hoverBorder, { opacity: tactile.hoverBorder }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  hoverBorder: {
    ...(StyleSheet.absoluteFill as object),
    borderWidth: 1,
    borderColor: glass.edgeModal,
    borderRadius: radii.control,
  },
});
