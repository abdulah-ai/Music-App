import { PropsWithChildren, useRef } from 'react';
import { Animated, Platform, Pressable, ViewStyle } from 'react-native';

type Props = PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  /** Scale while pressed. */
  scaleTo?: number;
  /** Scale while hovered (web/desktop pointers only). */
  hoverScaleTo?: number;
  hitSlop?: number;
}>;

/**
 * Touchable that springs down on press and lifts slightly under a pointer —
 * every tap in the app should feel physical, and every hover should answer back.
 */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.94,
  hoverScaleTo = 1.03,
  hitSlop,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const hovered = useRef(false);

  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(hovered.current ? hoverScaleTo : 1)}
      onHoverIn={
        Platform.OS === 'web'
          ? () => {
              hovered.current = true;
              if (!disabled) to(hoverScaleTo);
            }
          : undefined
      }
      onHoverOut={
        Platform.OS === 'web'
          ? () => {
              hovered.current = false;
              to(1);
            }
          : undefined
      }
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.5 } : null]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
