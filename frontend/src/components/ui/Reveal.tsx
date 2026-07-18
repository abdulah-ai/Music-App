import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../theme/tokens';

type Props = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  distance?: number;
  /** Replays the entrance without remounting child state (for focused routes). */
  resetKey?: string | number | boolean;
}>;

/** A single, restrained entrance that becomes immediate with reduced motion. */
export function Reveal({ children, delay = 0, style, distance = 10, resetKey }: Props) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: motion.duration.slow,
      easing: Easing.bezier(...motion.easing.decelerate),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reducedMotion, resetKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
