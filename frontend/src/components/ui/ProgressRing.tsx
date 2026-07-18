import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { palette } from '../../theme/theme';
import { colors, glass, motion, radii } from '../../theme/tokens';

type Props = PropsWithChildren<{
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  complete?: boolean;
}>;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Circular progress with the accent gradient stroke; children render in the center. */
export function ProgressRing({ progress, size = 46, strokeWidth = 4, complete = false, children }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const reduceMotion = useReducedMotion();
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const animatedProgress = useRef(new Animated.Value(clamped)).current;
  const completion = useRef(new Animated.Value(complete ? 1 : 0)).current;

  useEffect(() => {
    animatedProgress.stopAnimation();
    if (reduceMotion) {
      animatedProgress.setValue(clamped);
      return;
    }
    Animated.timing(animatedProgress, {
      toValue: clamped,
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing.standard),
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, clamped, reduceMotion]);

  useEffect(() => {
    completion.stopAnimation();
    if (reduceMotion) {
      completion.setValue(complete ? 1 : 0);
      return;
    }
    if (!complete) {
      completion.setValue(0);
      return;
    }
    completion.setValue(0);
    Animated.sequence([
      Animated.delay(motion.duration.base),
      Animated.timing(completion, {
        toValue: 1,
        duration: motion.duration.fast,
        easing: Easing.bezier(...motion.easing.standard),
        useNativeDriver: true,
      }),
    ]).start();
  }, [complete, completion, reduceMotion]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        transform: [{ scale: completion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] }) }],
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: completion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.18] }) }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.primary} />
            <Stop offset="100%" stopColor={palette.secondary} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(158,181,170,0.18)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={animatedProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [circumference, 0],
          })}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      </Animated.View>
      <Animated.View style={[styles.center, { opacity: completion.interpolate({ inputRange: [0, 0.72], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>{children}</Animated.View>
      <Animated.View
        style={[
          styles.checkWell,
          {
            opacity: completion,
            transform: [{ scale: completion.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
          },
        ]}
      >
        <Ionicons name="checkmark" size={Math.round(size * 0.42)} color={colors.success} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWell: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: glass.tintPrimary,
    borderWidth: 1,
    borderColor: glass.tintPrimaryStroke,
  },
});
