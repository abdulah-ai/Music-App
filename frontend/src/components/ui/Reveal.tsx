import { PropsWithChildren, useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { chapterDelay, motionPresets, type MotionPresetName } from '../../theme/motion';

type Props = PropsWithChildren<{
  delay?: number;
  style?: StyleProp<ViewStyle>;
  distance?: number;
  preset?: MotionPresetName;
  /** Index within a short reveal group. */
  chapterIndex?: number;
  /** Chapter index, used to keep related reveals in one bounded sequence. */
  chapter?: number;
  visible?: boolean;
  /** Replays the entrance without remounting child state (for focused routes). */
  resetKey?: string | number | boolean;
}>;

/** A single, restrained entrance that becomes immediate with reduced motion. */
export function Reveal({
  children,
  delay,
  style,
  distance,
  preset = 'entrance',
  chapterIndex = 0,
  chapter = 0,
  visible = true,
  resetKey,
}: Props) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(visible ? 0 : 1)).current;
  const recipe = motionPresets[preset];
  const groupedDelay = delay ?? chapterDelay(chapterIndex, chapter);

  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) {
      progress.setValue(visible ? 1 : 0);
      return;
    }

    if (visible) progress.setValue(0);
    const toValue = visible ? 1 : 0;
    const animation = Animated.timing(progress, {
      toValue,
      delay: visible ? groupedDelay : 0,
      duration: visible ? recipe.duration : motionPresets.dismiss.duration,
      easing: visible ? recipe.easing : motionPresets.dismiss.easing,
      useNativeDriver: true,
    });
    if (preset === 'continuous' && visible) {
      const loop = Animated.loop(Animated.sequence([
        animation,
        Animated.timing(progress, {
          toValue: 0,
          duration: recipe.duration,
          easing: recipe.easing,
          useNativeDriver: true,
        }),
      ]));
      loop.start();
      return () => loop.stop();
    }
    animation.start();
    return () => animation.stop();
  }, [groupedDelay, preset, progress, recipe, reducedMotion, resetKey, visible]);

  const translateY = distance == null
    ? recipe.translateY
    : [distance, 0] as const;

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [...recipe.opacity] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [...translateY] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [...recipe.scale] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
