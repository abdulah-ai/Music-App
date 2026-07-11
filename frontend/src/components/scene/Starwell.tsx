import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export type StarwellState = 'idle' | 'listening' | 'playing';

type StarwellProps = {
  state: StarwellState;
  amplitude?: number;
  size?: number;
  accentColor?: string;
};

const STATE_GLOW: Record<StarwellState, string> = {
  idle: '#63D6B5',
  listening: '#E9CD7E',
  playing: '#A99BDB',
};

/**
 * Starhollow's signature scene: a well of stars.
 *
 * Replaces the old moon orb. Three concentric rings breathe at offset phases
 * like ripples in a dark pool, a single spark orbits the rim, and a
 * four-point star burns at the centre, swelling with the audio amplitude.
 * Everything animates with native-driver transforms and opacity only — no
 * WebGL, no per-frame JS work — so it costs what the old orb cost.
 */
export function Starwell({ state, amplitude = 0, size = 220, accentColor }: StarwellProps) {
  const breathe = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || !mounted) return;
      loops = [
        Animated.loop(
          Animated.sequence([
            Animated.timing(breathe, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(breathe, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        ),
        Animated.loop(
          Animated.timing(orbit, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }),
        ),
      ];
      loops.forEach((loop) => loop.start());
    });
    return () => {
      mounted = false;
      loops.forEach((loop) => loop.stop());
    };
  }, [breathe, orbit]);

  const glow = accentColor ?? STATE_GLOW[state];
  const energy = Math.min(1, Math.max(0, amplitude));
  const starSize = size * 0.44;

  const ringScale = (from: number, to: number) =>
    breathe.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const spin = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.root, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* The well: ripple rings breathing at offset phases. */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 0.94,
            height: size * 0.94,
            borderRadius: size,
            borderColor: `${glow}26`,
            transform: [{ scale: ringScale(0.97, 1.02 + energy * 0.05) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size,
            borderColor: `${glow}3D`,
            transform: [{ scale: ringScale(1.03, 0.98) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pool,
          {
            width: size * 0.52,
            height: size * 0.52,
            borderRadius: size,
            backgroundColor: `${glow}14`,
            transform: [{ scale: ringScale(1, 1.08 + energy * 0.12) }],
          },
        ]}
      />

      {/* One spark orbiting the rim. */}
      <Animated.View style={[styles.orbitArm, { width: size * 0.8, height: size * 0.8, transform: [{ rotate: spin }] }]}>
        <View
          style={[
            styles.spark,
            {
              width: size * 0.035,
              height: size * 0.035,
              borderRadius: size,
              backgroundColor: glow,
              shadowColor: glow,
            },
          ]}
        />
      </Animated.View>

      {/* The star at the heart of the hollow. */}
      <Animated.View
        style={{
          // Sized + fully rounded so the glow (box-shadow on web) blooms as a
          // circle around the star instead of a hard-edged square tile.
          width: starSize,
          height: starSize,
          borderRadius: starSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [
            { scale: ringScale(1 + energy * 0.1, 1.05 + energy * 0.22) },
            { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1.5, -2.5] }) },
          ],
          shadowColor: glow,
          shadowOpacity: 0.4,
          shadowRadius: size * 0.12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
        }}
      >
        <Svg width={starSize} height={starSize} viewBox="0 0 100 100">
          <Path d="M50,2 L58,42 L98,50 L58,58 L50,98 L42,58 L2,50 L42,42 Z" fill={glow} opacity={0.92} />
          <Path d="M50,30 L53.4,46.6 L70,50 L53.4,53.4 L50,70 L46.6,53.4 L30,50 L46.6,46.6 Z" fill="#FFF9E8" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1 },
  pool: { position: 'absolute' },
  orbitArm: { position: 'absolute', alignItems: 'center' },
  spark: {
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
