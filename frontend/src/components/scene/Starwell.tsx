import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useReducedMotion } from '../../hooks/useReducedMotion';

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
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    breathe.stopAnimation();
    orbit.stopAnimation();
    if (reduceMotion) {
      breathe.setValue(0.45);
      orbit.setValue(0);
      return;
    }

    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
      Animated.loop(
        Animated.timing(orbit, {
          toValue: 1,
          duration: state === 'listening' ? 10000 : 14000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    ];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [breathe, orbit, reduceMotion, state]);

  const glow = accentColor ?? STATE_GLOW[state];
  const energy = reduceMotion
    ? state === 'listening' ? 0.35 : 0.15
    : Math.min(1, Math.max(0, amplitude));
  const starSize = size * 0.44;

  const ringScale = (from: number, to: number) =>
    breathe.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const spin = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.root, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* A small constellation gives the well depth even when motion is off. */}
      <View pointerEvents="none" style={[styles.constellation, { width: size * 0.72, height: size * 0.72 }]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Path
            d="M14 58 L29 30 L47 43 L65 22 L82 38 L72 66 L43 76 L14 58"
            fill="none"
            stroke={`${glow}2E`}
            strokeWidth="0.8"
          />
          {[
            [14, 58], [29, 30], [47, 43], [65, 22], [82, 38], [72, 66], [43, 76],
          ].map(([cx, cy], index) => (
            <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index % 3 === 0 ? 1.8 : 1.2} fill={index % 3 === 0 ? '#FFF9E8' : glow} opacity={0.7} />
          ))}
        </Svg>
      </View>

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

      {/* Broken constellation orbit: richer at rest, brighter with live audio. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbitArc,
          {
            width: size * 0.88,
            height: size * 0.88,
            opacity: 0.42 + energy * 0.42,
            transform: [{ rotate: spin }, { scale: 1 + energy * 0.035 }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="47" fill="none" stroke={`${glow}52`} strokeWidth="0.8" strokeDasharray="2 12" strokeLinecap="round" />
          <Circle cx="50" cy="3" r="1.8" fill="#FFF9E8" />
          <Circle cx="90" cy="72" r="1.4" fill={glow} />
          <Circle cx="15" cy="78" r="1.2" fill="#E9CD7E" />
        </Svg>
      </Animated.View>

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
  constellation: { position: 'absolute', opacity: 0.72 },
  ring: { position: 'absolute', borderWidth: 1 },
  pool: { position: 'absolute' },
  orbitArc: { position: 'absolute' },
  orbitArm: { position: 'absolute', alignItems: 'center' },
  spark: {
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
