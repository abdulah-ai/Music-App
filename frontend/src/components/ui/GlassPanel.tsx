import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, type ViewProps } from 'react-native';

import { glassRecipes, radii } from '../../theme/tokens';

export type GlassTier = keyof typeof glassRecipes;

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  /** Retained for API compatibility. Blur strength is uniform across panes. */
  intensity?: number;
  overlayColor?: string;
  edgeColor?: string;
  variant?: GlassTier;
  onLayout?: ViewProps['onLayout'];
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
  overlayColor,
  edgeColor,
  variant = 'raised',
  onLayout,
}: Props) {
  const recipe = glassRecipes[variant];
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.panel,
        recipe.shadow,
        recipe.backdrop,
        { backgroundColor: overlayColor ?? recipe.fill, borderColor: recipe.stroke },
        style,
      ]}
    >
      <View pointerEvents="none" style={[styles.edge, { backgroundColor: edgeColor ?? recipe.topEdge }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
  },
});
