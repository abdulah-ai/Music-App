import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export type MoonlightState = 'idle' | 'listening' | 'playing';

type MoonlightProps = {
  state: MoonlightState;
  amplitude?: number;
  size?: number;
  accentColor?: string;
};

/**
 * Web-first moon built from composited CSS circles. The native implementation
 * keeps the full Three.js scene; this platform file prevents Three.js/WebGL
 * from blocking the login screen and first paint in the APK's WebView.
 */
export function Moonlight({ state, amplitude = 0, size = 220, accentColor }: MoonlightProps) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const glow = accentColor ?? (state === 'listening' ? '#E8C468' : state === 'playing' ? '#B39DFF' : '#FF8A5C');
  const energy = Math.min(1, Math.max(0, amplitude));
  const moonSize = size * 0.5;

  return (
    <View style={[styles.root, { width: size, height: size }]} accessibilityElementsHidden>
      <Animated.View
        style={[
          styles.halo,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size,
            backgroundColor: `${glow}18`,
            transform: [
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1 + energy * 0.04, 1.08 + energy * 0.08] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.moon,
          {
            width: moonSize,
            height: moonSize,
            borderRadius: moonSize,
            backgroundColor: '#F1EDF7',
            shadowColor: glow,
            transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) }],
          },
        ]}
      >
        <View style={[styles.crater, { width: moonSize * 0.16, height: moonSize * 0.16, borderRadius: moonSize, top: moonSize * 0.2, left: moonSize * 0.22 }]} />
        <View style={[styles.crater, { width: moonSize * 0.1, height: moonSize * 0.1, borderRadius: moonSize, top: moonSize * 0.55, left: moonSize * 0.62 }]} />
        <View style={[styles.shade, { width: moonSize, height: moonSize, borderRadius: moonSize, left: moonSize * 0.34 }]} />
      </Animated.View>
      <View style={[styles.orbit, { width: size * 0.82, height: size * 0.32, borderRadius: size, borderColor: `${glow}4A` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  moon: {
    overflow: 'hidden',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  shade: { position: 'absolute', top: 0, backgroundColor: 'rgba(43, 31, 58, 0.2)' },
  crater: { position: 'absolute', backgroundColor: 'rgba(78, 60, 91, 0.13)' },
  orbit: { position: 'absolute', borderWidth: 1, transform: [{ rotate: '-12deg' }] },
});
