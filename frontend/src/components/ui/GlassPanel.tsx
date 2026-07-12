import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { glass, glassBlur, radii, shadows } from '../../theme/tokens';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Retained for API compatibility. Blur strength is uniform across panes. */
  intensity?: number;
  overlayColor?: string;
  edgeColor?: string;
}>;

/**
 * Starhollow's default raised surface: a frosted navy pane. The translucent
 * fill lets the ambient starfield show through, backdrop blur (web/APK)
 * smears it into a soft mirror sheen, and a lit top edge sells the glass.
 */
export function GlassPanel({
  children,
  style,
  intensity: _intensity,
  overlayColor = glass.fill,
  edgeColor = glass.edge,
}: Props) {
  return (
    <View style={[styles.panel, { backgroundColor: overlayColor }, glassBlur, style]}>
      <View pointerEvents="none" style={[styles.edge, { backgroundColor: edgeColor }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: glass.stroke,
    overflow: 'hidden',
    ...shadows.card,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
  },
});
