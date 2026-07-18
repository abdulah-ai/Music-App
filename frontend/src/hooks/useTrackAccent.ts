import { useEffect, useMemo, useState } from 'react';

import { getDominantColor } from '../utils/dominantColor';
import { ensureTrackAccentContrast } from '../utils/accentContrast';
import { useTheme } from '../theme/ThemeProvider';

export type TrackAccentTokens = {
  /** The four intentionally bounded places where artwork color may appear. */
  artworkAura: string;
  waveform: string;
  playControl: string;
  miniPlayerHighlight: string;
  source: 'artwork' | 'forest-fallback';
};

/**
 * A contrast-corrected, placement-bound track accent. Returning named uses
 * prevents sampled artwork color from leaking into the forest-led shell.
 */
export function useTrackAccent(thumbnailUrl: string | null | undefined): TrackAccentTokens {
  const [sampledColor, setSampledColor] = useState<string | null>(null);
  const { theme } = useTheme();
  const contrastSurface = theme.palette.surfaceElevated;
  const fallback = theme.palette.primary;

  useEffect(() => {
    let alive = true;
    setSampledColor(null);
    getDominantColor(thumbnailUrl).then((color) => {
      if (alive) setSampledColor(color);
    });
    return () => {
      alive = false;
    };
  }, [thumbnailUrl]);

  return useMemo(() => {
    const color = ensureTrackAccentContrast(sampledColor ?? fallback, contrastSurface);
    return {
      artworkAura: color,
      waveform: color,
      playControl: color,
      miniPlayerHighlight: color,
      source: sampledColor ? 'artwork' : 'forest-fallback',
    };
  }, [contrastSurface, fallback, sampledColor]);
}
