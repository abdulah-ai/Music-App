import { Platform, StyleSheet, useWindowDimensions, View, type ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  variant?: 'app' | 'sanctuary';
};

const FOREST_PORTRAIT = require('../../../assets/starhollow-forest-portrait.png');
const FOREST_LANDSCAPE = require('../../../assets/starhollow-forest-landscape.png');

/**
 * The shared Star Hollow environment. Local bundled assets keep the forest
 * available offline and avoid a different background loading state on every
 * screen. Screen-specific surfaces sit above the same responsive canvas.
 */
export function ForestBackdrop({ variant = 'app' }: Props) {
  const { width, height } = useWindowDimensions();
  const portrait = height > width * 1.12;
  const sanctuary = variant === 'sanctuary';
  const { scheme } = useTheme();
  const daylight = scheme === 'light' && !sanctuary;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`forest-backdrop-${variant}`}
      style={StyleSheet.absoluteFill}
    >
      <Image
        source={portrait ? FOREST_PORTRAIT : FOREST_LANDSCAPE}
        style={[StyleSheet.absoluteFill, !sanctuary && !daylight && darkAppForestImage, daylight && lightForestImage]}
        contentFit="cover"
        contentPosition="center"
        cachePolicy="memory-disk"
        priority="high"
        transition={sanctuary ? 180 : 0}
      />
      <LinearGradient
        colors={
          sanctuary
            ? ['rgba(2,7,10,0.18)', 'rgba(3,10,9,0.22)', 'rgba(2,8,6,0.68)']
            : daylight
              ? ['rgba(246,250,246,0.34)', 'rgba(235,244,237,0.46)', 'rgba(218,232,222,0.68)']
            : ['rgba(4,10,13,0.02)', 'rgba(5,18,15,0.06)', 'rgba(4,10,9,0.22)']
        }
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      {!sanctuary ? <View style={[styles.appVeil, daylight && styles.daylightVeil]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 13, 12, 0.02)',
  },
  daylightVeil: { backgroundColor: 'rgba(239, 246, 241, 0.16)' },
});

const lightForestImage: ImageStyle =
  Platform.OS === 'web'
    ? ({ filter: 'brightness(1.62) saturate(0.68) contrast(0.82)' } as unknown as ImageStyle)
    : { opacity: 0.88 };

const darkAppForestImage: ImageStyle =
  Platform.OS === 'web'
    ? ({ filter: 'brightness(2.05) saturate(1.05) contrast(0.96)' } as unknown as ImageStyle)
    : { opacity: 1 };
