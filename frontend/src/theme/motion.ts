import { Easing } from 'react-native';

import { motion } from './theme';

export type MotionPresetName = 'entrance' | 'emphasis' | 'dismiss' | 'continuous';

/**
 * Shared choreography recipes. Components may choose different visual
 * properties, but timing and easing always come from this vocabulary.
 */
export const motionPresets = {
  entrance: {
    duration: motion.duration.slow,
    easing: Easing.bezier(...motion.easing.decelerate),
    opacity: [0, 1] as const,
    translateY: [10, 0] as const,
    scale: [0.985, 1] as const,
  },
  emphasis: {
    duration: motion.duration.base,
    easing: Easing.bezier(...motion.easing.standard),
    opacity: [0.72, 1] as const,
    translateY: [2, 0] as const,
    scale: [0.985, 1] as const,
  },
  dismiss: {
    duration: motion.duration.fast,
    easing: Easing.bezier(...motion.easing.accelerate),
    opacity: [0, 1] as const,
    translateY: [6, 0] as const,
    scale: [0.99, 1] as const,
  },
  continuous: {
    duration: motion.duration.continuous,
    easing: Easing.inOut(Easing.sin),
    opacity: [0.88, 1] as const,
    translateY: [1, -1] as const,
    scale: [0.995, 1.005] as const,
  },
} as const;

/** Short grouped chapter cadence; delays stay bounded on long screens. */
export function chapterDelay(index = 0, group = 0): number {
  return Math.min(motion.stagger.max, group * motion.stagger.chapter + index * motion.stagger.item);
}
