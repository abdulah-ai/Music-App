import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RippleField } from '../ui/RippleField';
import { GradientText } from '../ui/GradientText';
import { PressableScale } from '../ui/PressableScale';
import { streamUrl } from '../../services/api/library';
import { tokenStorage } from '../../services/storage/tokenStorage';
import { useLibraryStore } from '../../store/libraryStore';
import { useVideoPlayerStore } from '../../store/videoPlayerStore';
import { colors, gradients, radii, shadows, spacing, typography } from '../../theme/tokens';

const STRIP_CARD_WIDTH = 132;
const MINI_WIDTH = 208;
const MINI_HEIGHT = 117; // 16:9

/**
 * The one place video actually plays. Lives outside the navigation stack so
 * minimizing never unmounts (and never stops) the video — it just shrinks
 * into a draggable floating window docked wherever the viewer left it.
 */
export function GlobalVideoStage() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const items = useLibraryStore((s) => s.items);
  const mediaId = useVideoPlayerStore((s) => s.mediaId);
  const mode = useVideoPlayerStore((s) => s.mode);
  const setMediaId = useVideoPlayerStore((s) => s.setMediaId);
  const minimize = useVideoPlayerStore((s) => s.minimize);
  const expand = useVideoPlayerStore((s) => s.expand);
  const close = useVideoPlayerStore((s) => s.close);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [theater, setTheater] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoQueue = useMemo(
    () => [...items].filter((m) => m.media_type === 'video').sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [items],
  );
  const queueIndex = videoQueue.findIndex((m) => m.id === mediaId);
  const media = videoQueue[queueIndex] ?? items.find((m) => m.id === mediaId) ?? null;
  const prevMedia = queueIndex > 0 ? videoQueue[queueIndex - 1] : null;
  const nextMedia = queueIndex >= 0 && queueIndex < videoQueue.length - 1 ? videoQueue[queueIndex + 1] : null;
  const upNext = queueIndex >= 0 ? videoQueue.slice(queueIndex + 1, queueIndex + 9) : [];

  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!media) return;
      const token = await tokenStorage.getAccessToken();
      const url = token ? `${streamUrl(media.id)}?token=${encodeURIComponent(token)}` : streamUrl(media.id);
      if (alive) setSourceUrl(url);
    })();
    return () => {
      alive = false;
    };
  }, [media?.id]);

  useEffect(() => {
    if (!sourceUrl) return;
    player.replaceAsync(sourceUrl).then(() => player.play()).catch(() => {});
  }, [sourceUrl, player]);

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (nextMedia) setMediaId(nextMedia.id);
    });
    return () => subscription.remove();
  }, [player, nextMedia?.id, setMediaId]);

  useEffect(() => {
    const subscription = player.addListener('playingChange', ({ isPlaying: playing }) => setIsPlaying(playing));
    return () => subscription.remove();
  }, [player]);

  // Mini window drag — clamped to screen bounds, released position sticks.
  const pan = useRef(new Animated.ValueXY({ x: 12, y: 80 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        pan.stopAnimation();
        // @ts-expect-error — private fields used only to read the current offset for the grant snapshot.
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        // @ts-expect-error — reading current values to clamp within the viewport.
        const x = Math.max(8, Math.min(screenWidth - MINI_WIDTH - 8, pan.x._value));
        // @ts-expect-error
        const y = Math.max(insets.top + 8, Math.min(screenHeight - MINI_HEIGHT - 8, pan.y._value));
        Animated.spring(pan, { toValue: { x, y }, useNativeDriver: false, friction: 8 }).start();
      },
    }),
  ).current;

  if (!media || mode === 'closed') return null;

  if (mode === 'mini') {
    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.miniWrap, { transform: pan.getTranslateTransform() }]}
      >
        <Pressable onPress={expand} style={StyleSheet.absoluteFill}>
          <VideoView player={player} style={styles.miniVideo} contentFit="cover" nativeControls={false} />
        </Pressable>
        <LinearGradient colors={gradients.coverScrim} style={styles.miniScrim} pointerEvents="none" />
        <Text numberOfLines={1} style={styles.miniTitle} pointerEvents="none">
          {media.title ?? media.recognized_title ?? 'Untitled'}
        </Text>
        <View style={styles.miniControls}>
          <Pressable onPress={() => (isPlaying ? player.pause() : player.play())} hitSlop={8} style={styles.miniButton}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={13} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={expand} hitSlop={8} style={styles.miniButton}>
            <Ionicons name="expand" size={12} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={close} hitSlop={8} style={styles.miniButton}>
            <Ionicons name="close" size={13} color={colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  // ---- expanded (fullscreen) ----
  return (
    <View style={styles.root}>
      <RippleField />

      <View pointerEvents="box-none" style={[styles.topBar, { top: insets.top + spacing.sm }]}>
        <Pressable onPress={minimize} hitSlop={12} style={styles.closeButton}>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>
        {!theater && (
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>
              {queueIndex >= 0 ? `VIDEO ${queueIndex + 1} OF ${videoQueue.length}` : 'VIDEO'}
            </Text>
          </View>
        )}
        <Pressable onPress={() => setTheater((v) => !v)} hitSlop={12} style={styles.closeButton}>
          <Ionicons name={theater ? 'contract' : 'expand'} size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.stage}>
        <VideoView player={player} style={styles.video} nativeControls allowsPictureInPicture contentFit="contain" />
      </View>

      {!theater && (
        <View style={[styles.metaBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.metaRow}>
            <PressableScale onPress={() => prevMedia && setMediaId(prevMedia.id)} disabled={!prevMedia} scaleTo={0.88}>
              <View style={styles.skipButton}>
                <Ionicons name="play-skip-back" size={20} color={colors.textSecondary} />
              </View>
            </PressableScale>

            <View style={styles.meta}>
              <GradientText numberOfLines={1} style={styles.title}>
                {media.title ?? media.recognized_title ?? 'Untitled'}
              </GradientText>
              <Text numberOfLines={1} style={styles.artist}>
                {media.artist ?? media.recognized_artist ?? 'Unknown source'}
              </Text>
            </View>

            <PressableScale onPress={() => nextMedia && setMediaId(nextMedia.id)} disabled={!nextMedia} scaleTo={0.88}>
              <View style={styles.skipButton}>
                <Ionicons name="play-skip-forward" size={20} color={colors.textSecondary} />
              </View>
            </PressableScale>
          </View>

          {upNext.length > 0 && (
            <View style={styles.upNextBlock}>
              <Text style={styles.upNextHeading}>UP NEXT</Text>
              <FlatList
                horizontal
                data={upNext}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stripContent}
                renderItem={({ item }) => (
                  <PressableScale onPress={() => setMediaId(item.id)} scaleTo={0.95}>
                    <View style={styles.stripCard}>
                      {item.thumbnail_url ? (
                        <Image source={{ uri: item.thumbnail_url }} style={styles.stripThumb} />
                      ) : (
                        <LinearGradient colors={gradients.coverFallback} style={styles.stripThumb}>
                          <Ionicons name="videocam" size={16} color="rgba(231,235,230,0.4)" />
                        </LinearGradient>
                      )}
                      <Text numberOfLines={1} style={styles.stripTitle}>
                        {item.title ?? item.recognized_title ?? 'Untitled'}
                      </Text>
                    </View>
                  </PressableScale>
                )}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050805',
    zIndex: 50,
  },
  topBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(18,28,24,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(18,28,24,0.6)',
  },
  chipLabel: { ...typography.eyebrow, fontSize: 10, letterSpacing: 2, color: colors.textSecondary },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  metaBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, width: '100%', maxWidth: 960, alignSelf: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  skipButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(18,28,24,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, alignItems: 'center' },
  title: { ...typography.title, fontSize: 20, lineHeight: 26, textAlign: 'center' },
  artist: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  upNextBlock: { marginTop: spacing.md },
  upNextHeading: { ...typography.eyebrow, fontSize: 10, letterSpacing: 2, color: colors.textMuted, marginBottom: spacing.sm },
  stripContent: { gap: spacing.sm },
  stripCard: { width: STRIP_CARD_WIDTH, gap: 4 },
  stripThumb: {
    width: STRIP_CARD_WIDTH,
    height: 74,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,176,168,0.14)',
  },
  stripTitle: { ...typography.caption, fontSize: 11, color: colors.textSecondary },

  // ---- mini floating window ----
  miniWrap: {
    position: 'absolute',
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(167,176,168,0.18)',
    zIndex: 60,
    ...shadows.card,
  },
  miniVideo: { width: '100%', height: '100%' },
  miniScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  miniTitle: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm + 26,
    right: spacing.sm,
    ...typography.caption,
    fontSize: 11,
    color: colors.textPrimary,
  },
  miniControls: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm - 2,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniButton: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(5,8,5,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
