import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

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
        style={StyleSheet.absoluteFill}
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
            : ['rgba(4,10,13,0.3)', 'rgba(5,13,12,0.46)', 'rgba(4,10,9,0.72)']
        }
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      {!sanctuary ? <View style={styles.appVeil} /> : null}
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
    backgroundColor: 'rgba(5, 13, 12, 0.08)',
  },
});
