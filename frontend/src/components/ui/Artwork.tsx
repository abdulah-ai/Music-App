import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE_URL } from '../../config';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, glass, radii } from '../../theme/tokens';
import { coverGlyphColor, coverGradient, displayArtist, displayTitle } from '../../utils/mediaDisplay';

export type ArtworkMedia = {
  id?: string | number | null;
  title?: string | null;
  recognized_title?: string | null;
  artist?: string | null;
  recognized_artist?: string | null;
  duration_seconds?: number | null;
  media_type?: 'audio' | 'video' | string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
  artwork_url?: string | null;
  artworkUrl?: string | null;
};

type Props = {
  media: ArtworkMedia | null | undefined;
  size?: number | '100%';
  style?: StyleProp<ViewStyle>;
  /** Prioritizes hero/now-playing art. Lists remain lazy by default. */
  priority?: boolean;
  accessibilityLabel?: string;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain';
};

function resolveUri(media: ArtworkMedia | null | undefined) {
  const raw = media?.thumbnail_url ?? media?.thumbnailUrl ?? media?.artwork_url ?? media?.artworkUrl ?? null;
  if (!raw) return null;
  return raw.startsWith('/') ? `${API_BASE_URL}${raw}` : raw;
}

/** Cached, recyclable cover art with a stable fallback and no layout shift. */
export function Artwork({
  media,
  size = 48,
  style,
  priority = false,
  accessibilityLabel,
  borderRadius = radii.sm,
  contentFit = 'cover',
}: Props) {
  const reduceMotion = useReducedMotion();
  const key = String(media?.id ?? resolveUri(media) ?? 'untitled');
  const uri = resolveUri(media);
  const title = displayTitle({
    title: media?.title ?? null,
    recognized_title: media?.recognized_title ?? null,
    duration_seconds: media?.duration_seconds ?? null,
  });
  const artist = displayArtist({
    artist: media?.artist ?? null,
    recognized_artist: media?.recognized_artist ?? null,
  });
  const label = accessibilityLabel ?? `${title}${artist ? ` by ${artist}` : ''} artwork`;
  const dimensions: ViewStyle = { width: size, height: size };
  const fallbackBadgeSize = typeof size === 'number'
    ? Math.max(28, Math.min(72, size * 0.48))
    : 64;
  const fallbackGlyphSize = Math.max(16, Math.round(fallbackBadgeSize * 0.44));

  return (
    <View
      accessible={!uri}
      accessibilityRole={!uri ? 'image' : undefined}
      accessibilityLabel={!uri ? label : undefined}
      style={[styles.root, dimensions, { borderRadius }, style]}
    >
      <LinearGradient colors={[...coverGradient(key)]} style={StyleSheet.absoluteFill}>
        <View style={styles.fallbackIcon}>
          <View
            style={[
              styles.fallbackBadge,
              { width: fallbackBadgeSize, height: fallbackBadgeSize },
            ]}
          >
            <Ionicons
              name={media?.media_type === 'video' ? 'videocam' : 'musical-notes'}
              size={fallbackGlyphSize}
              color={coverGlyphColor(key)}
            />
          </View>
        </View>
      </LinearGradient>
      {uri ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          priority={priority ? 'high' : 'normal'}
          loading={priority ? 'eager' : 'lazy'}
          recyclingKey={key}
          transition={reduceMotion ? 0 : priority ? 120 : 160}
          accessible
          accessibilityLabel={label}
          alt={label}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: colors.surfaceBright,
  },
  fallbackIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: glass.fillBright,
    borderWidth: 1,
    borderColor: glass.strokeStrong,
  },
});
