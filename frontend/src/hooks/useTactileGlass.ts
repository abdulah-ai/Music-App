import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';

import { useReducedMotion } from './useReducedMotion';
import { motion } from '../theme/tokens';

/** One restrained physical grammar for controls set into glass. */
export function useTactileGlass({ disabled = false, scaleTo = 0.98 }: { disabled?: boolean; scaleTo?: number } = {}) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const highlight = useRef(new Animated.Value(1)).current;
  const hoverBorder = useRef(new Animated.Value(0)).current;
  const hovered = useRef(false);

  useEffect(() => () => {
    scale.stopAnimation();
    highlight.stopAnimation();
    hoverBorder.stopAnimation();
  }, [highlight, hoverBorder, scale]);

  const settle = (pressed: boolean) => {
    scale.stopAnimation();
    highlight.stopAnimation();
    if (reducedMotion || disabled) {
      scale.setValue(1);
      highlight.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? scaleTo : 1,
        useNativeDriver: true,
        speed: pressed ? motion.spring.pressSpeed : motion.spring.returnSpeed,
        bounciness: 0,
      }),
      Animated.timing(highlight, {
        toValue: pressed ? 0.92 : 1,
        duration: pressed ? motion.duration.instant : motion.duration.fast,
        easing: Easing.bezier(...motion.easing.standard),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const setHovered = (value: boolean) => {
    hovered.current = value;
    hoverBorder.stopAnimation();
    if (reducedMotion || disabled) {
      hoverBorder.setValue(value && !disabled ? 1 : 0);
      return;
    }
    Animated.timing(hoverBorder, {
      toValue: value ? 1 : 0,
      duration: motion.duration.fast,
      easing: Easing.bezier(...motion.easing.standard),
      useNativeDriver: true,
    }).start();
  };

  return {
    scale,
    highlight,
    hoverBorder,
    onPressIn: () => settle(true),
    onPressOut: () => settle(false),
    onHoverIn: Platform.OS === 'web' ? () => setHovered(true) : undefined,
    onHoverOut: Platform.OS === 'web' ? () => setHovered(false) : undefined,
  };
}

