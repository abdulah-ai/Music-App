import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, glass, motion, radii, spacing, typography } from '../../theme/tokens';

export type TabChipOption<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props<T extends string> = {
  options: readonly TabChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Variable-width tab chips sharing the same measured mint selection plate. */
export function TabChipRow<T extends string>({ options, value, onChange, accessibilityLabel, style }: Props<T>) {
  const reducedMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const plateX = useRef(new Animated.Value(0)).current;
  const plateWidth = useRef(new Animated.Value(0)).current;
  const activeLayout = layouts[value];

  useEffect(() => {
    if (!activeLayout) return;
    plateX.stopAnimation();
    plateWidth.stopAnimation();
    if (reducedMotion) {
      plateX.setValue(activeLayout.x);
      plateWidth.setValue(activeLayout.width);
      return;
    }
    Animated.parallel([
      Animated.timing(plateX, {
        toValue: activeLayout.x,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing.standard),
        useNativeDriver: false,
      }),
      Animated.timing(plateWidth, {
        toValue: activeLayout.width,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing.standard),
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeLayout, plateWidth, plateX, reducedMotion]);

  const initialWidth = useMemo(() => activeLayout?.width ?? 0, [activeLayout?.width]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={style}
      contentContainerStyle={styles.row}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.plate,
          {
            opacity: initialWidth > 0 ? 1 : 0,
            width: plateWidth,
            transform: [{ translateX: plateX }],
          },
        ]}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setLayouts((current) => {
                const previous = current[option.value];
                if (previous?.x === x && previous.width === width) return current;
                return { ...current, [option.value]: { x, width } };
              });
            }}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            {option.icon ? <Ionicons name={option.icon} size={14} color={selected ? colors.cyan : colors.textMuted} /> : null}
            <Text numberOfLines={1} style={[styles.label, selected && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { position: 'relative', flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.md },
  plate: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radii.pill,
    backgroundColor: glass.tintPrimary,
    borderWidth: 1,
    borderColor: glass.tintPrimaryStroke,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.78 },
  label: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  labelActive: { color: colors.cyan, fontFamily: 'Sora_500Medium' },
});
