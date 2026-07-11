import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayerStore } from '../../store/playerStore';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { displayArtist, displayTitle } from '../../utils/mediaDisplay';
import { Artwork } from '../ui/Artwork';
import { QueueList } from '../player/QueueList';

type Props = {
  visible: boolean;
  onClose: () => void;
  accent?: string;
};

const STAR_COUNT = 26;
const BAR_COUNT = 20;
const CONTROLS_TIMEOUT_MS = 4500;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

/** Deterministic pseudo-random so the sky doesn't reshuffle on every render. */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Star({ index, width, height, animate }: { index: number; width: number; height: number; animate: boolean }) {
  const twinkle = useRef(new Animated.Value(seeded(index, 7))).current;
  const size = 1 + seeded(index, 3) * 2.4;
  const left = seeded(index, 1) * width;
  const top = seeded(index, 2) * height * 0.62;
  const gold = seeded(index, 5) > 0.8;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 1,
          duration: 1600 + seeded(index, 4) * 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0.25,
          duration: 1600 + seeded(index, 6) * 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, index, twinkle]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: gold ? colors.gold : colors.textPrimary,
        opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.85] }),
      }}
    />
  );
}

function VisualizerBar({ index, playing, accent }: { index: number; playing: boolean; accent: string }) {
  const level = useRef(new Animated.Value(0.25 + seeded(index, 9) * 0.3)).current;

  useEffect(() => {
    if (!playing) {
      Animated.timing(level, { toValue: 0.14, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      return;
    }
    let alive = true;
    function pulse() {
      if (!alive) return;
      Animated.timing(level, {
        toValue: 0.15 + Math.random() * 0.85,
        duration: 260 + Math.random() * 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => finished && pulse());
    }
    pulse();
    return () => {
      alive = false;
      level.stopAnimation();
    };
  }, [level, playing]);

  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[
          styles.barFill,
          {
            backgroundColor: accent,
            transform: [{ scaleY: level }],
          },
        ]}
      />
    </View>
  );
}

/**
 * Sanctuary Mode — the immersive night-garden playback scene.
 *
 * The whole screen becomes the hollow: a drifting aurora, a twinkling
 * starfield, pine ridges at the horizon, and a soft ambient visualizer under
 * minimal controls. Controls fade away after a few seconds; tapping anywhere
 * brings them back. Everything animates through native-driver transforms and
 * opacity so an hour in here costs no more than the regular player.
 */
export function SanctuaryMode({ visible, onClose, accent = colors.cyan }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [queueOpen, setQueueOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const auroraDrift = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMedia = usePlayerStore((state) => state.currentMedia);
  const playing = usePlayerStore((state) => state.playing);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const toggle = usePlayerStore((state) => state.toggle);
  const seek = usePlayerStore((state) => state.seek);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrev = usePlayerStore((state) => state.playPrev);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => mounted && setReduceMotion(enabled));
    return () => {
      mounted = false;
    };
  }, []);

  // The aurora slowly sways side to side, always.
  useEffect(() => {
    if (!visible || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(auroraDrift, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(auroraDrift, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [auroraDrift, reduceMotion, visible]);

  // Controls auto-hide while playing; any tap wakes them.
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity, controlsVisible]);

  useEffect(() => {
    if (!visible || !controlsVisible || !playing || queueOpen) return;
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_TIMEOUT_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [controlsVisible, playing, queueOpen, visible]);

  useEffect(() => {
    if (visible) setControlsVisible(true);
  }, [visible]);

  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => i), []);
  const progress = duration ? Math.min(1, currentTime / duration) : 0;

  if (!currentMedia) return null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={styles.root}
        onPress={() => setControlsVisible((value) => !value)}
        accessibilityLabel={controlsVisible ? 'Hide controls' : 'Show controls'}
      >
        {/* Sky */}
        <LinearGradient
          colors={['#03080A', '#071310', '#0B1A14']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Aurora bands drifting behind everything. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.aurora,
            {
              width: width * 1.6,
              height: height * 0.55,
              transform: [
                { translateX: auroraDrift.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.25, width * 0.05] }) },
                { rotate: '-9deg' },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(99,214,181,0)', 'rgba(99,214,181,0.15)', 'rgba(169,155,219,0.12)', 'rgba(99,214,181,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Starfield */}
        {stars.map((index) => (
          <Star key={index} index={index} width={width} height={height} animate={visible && !reduceMotion} />
        ))}

        {/* Pine ridge horizon */}
        <View pointerEvents="none" style={styles.ridge}>
          <Svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none">
            <Path d="M0,20 L8,10 L15,17 L24,7 L32,15 L42,5 L52,15 L60,8 L70,16 L80,6 L90,14 L100,9 L100,24 L0,24 Z" fill="#050D0A" opacity={0.9} />
            <Path d="M0,24 L10,16 L22,21 L34,14 L48,21 L62,15 L76,21 L88,16 L100,20 L100,24 Z" fill="#030906" />
          </Svg>
        </View>

        {/* Content */}
        <Animated.View
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
          style={[styles.content, { opacity: controlsOpacity, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}
        >
          <View style={styles.topRow}>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Leave Sanctuary Mode" style={styles.topButton}>
              <Ionicons name="chevron-down" size={22} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.modePill}>
              <Ionicons name="moon" size={11} color={accent} />
              <Text style={styles.modeLabel}>SANCTUARY</Text>
            </View>
            <Pressable
              onPress={() => setQueueOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open queue"
              style={styles.topButton}
            >
              <Ionicons name="list" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.centerBlock} pointerEvents="box-none">
            <View style={[styles.artworkGlow, { shadowColor: accent }]}>
              <Artwork media={currentMedia} size={Math.min(width * 0.56, height * 0.3, 300)} priority borderRadius={radii.lg + 6} />
            </View>
            <Text numberOfLines={1} style={styles.title}>{displayTitle(currentMedia)}</Text>
            <Text numberOfLines={1} style={styles.artist}>{displayArtist(currentMedia) ?? 'Unknown artist'}</Text>
          </View>

          <View style={styles.bottomBlock} pointerEvents="box-none">
            {/* Ambient visualizer */}
            <View style={styles.visualizerRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: BAR_COUNT }, (_, index) => (
                <VisualizerBar key={index} index={index} playing={visible && playing && !reduceMotion} accent={accent} />
              ))}
            </View>

            {/* Thin seek line */}
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel={`Seek position, ${formatTime(currentTime)} of ${formatTime(duration)}`}
              onPress={(event) => {
                const x = event.nativeEvent.locationX;
                const barWidth = width - spacing.lg * 2;
                if (barWidth > 0 && duration) seek((x / barWidth) * duration);
              }}
              style={styles.seekTrack}
            >
              <View style={[styles.seekFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
            </Pressable>
            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatTime(currentTime)}</Text>
              <Text style={styles.time}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.transportRow}>
              <Pressable onPress={() => void playPrev()} accessibilityRole="button" accessibilityLabel="Previous track" style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
                <Ionicons name="play-skip-back" size={26} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={toggle}
                accessibilityRole="button"
                accessibilityLabel={playing ? 'Pause' : 'Play'}
                style={({ pressed }) => [styles.play, { borderColor: accent }, pressed && styles.pressed]}
              >
                {isBuffering ? (
                  <ActivityIndicator color={accent} />
                ) : (
                  <Ionicons name={playing ? 'pause' : 'play'} size={30} color={colors.textPrimary} style={playing ? undefined : { marginLeft: 3 }} />
                )}
              </Pressable>
              <Pressable onPress={() => void playNext()} accessibilityRole="button" accessibilityLabel="Next track" style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
                <Ionicons name="play-skip-forward" size={26} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Queue overlay */}
        {queueOpen ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={styles.queueBackdrop} onPress={() => setQueueOpen(false)} accessibilityRole="button" accessibilityLabel="Close queue" />
            <View style={[styles.queueCard, { paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.queueHandle} />
              <Text style={styles.queueTitle}>Up next</Text>
              <View style={styles.queueBody}>
                <QueueList />
              </View>
            </View>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03080A' },
  aurora: { position: 'absolute', top: '6%', left: '-20%', opacity: 0.9 },
  ridge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%' },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,15,12,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(158,181,170,0.14)',
  },
  modePill: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7,15,12,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(158,181,170,0.12)',
  },
  modeLabel: { ...typography.eyebrow, fontSize: 9, letterSpacing: 2.2, color: colors.textSecondary },
  centerBlock: { alignItems: 'center', gap: spacing.xs },
  artworkGlow: {
    borderRadius: radii.lg + 6,
    shadowOpacity: 0.45,
    shadowRadius: 46,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
    marginBottom: spacing.md,
  },
  title: { ...typography.title, fontSize: 22, lineHeight: 28, color: colors.textPrimary, textAlign: 'center' },
  artist: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  bottomBlock: { gap: spacing.sm },
  visualizerRow: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    marginBottom: spacing.xs,
  },
  barTrack: { width: 4, height: 42, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: 4, height: 42, borderRadius: 2, opacity: 0.75, transformOrigin: 'bottom' },
  seekTrack: {
    height: 22,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  seekFill: { height: 3, borderRadius: radii.pill },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  time: { ...typography.caption, fontSize: 10, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  transportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  skip: { width: 52, height: 52, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: 'rgba(7,15,12,0.55)',
  },
  pressed: { opacity: 0.7 },
  queueBackdrop: { ...(StyleSheet.absoluteFill as object), backgroundColor: 'rgba(2,5,4,0.6)' },
  queueCard: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
    maxHeight: '62%',
    borderTopLeftRadius: radii.lg + 4,
    borderTopRightRadius: radii.lg + 4,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
  },
  queueHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: spacing.sm, backgroundColor: colors.surfaceBright },
  queueTitle: { ...typography.subtitle, color: colors.textPrimary, marginBottom: spacing.sm },
  queueBody: { flexGrow: 0, minHeight: 180, maxHeight: 420 },
});
