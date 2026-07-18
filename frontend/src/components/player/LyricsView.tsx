import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../ui/Button';
import { fetchLyrics, type Lyrics } from '../../services/api/lyrics';
import { usePlayerStore } from '../../store/playerStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { colors, spacing, typography } from '../../theme/tokens';

/** How far ahead of the audio clock a line lights up — feels "on the beat". */
const SYNC_LEAD_SECONDS = 0.25;
const ANNOUNCEMENT_INTERVAL_SECONDS = 15;

function seekLabel(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)} minutes ${whole % 60} seconds`;
}

/**
 * Karaoke-style synced lyrics for the current track. Lines light up in time
 * with playback and the view keeps the active line centered; tapping a line
 * seeks straight to it. Falls back to plain lyrics, then to a quiet empty state.
 */
export function LyricsView() {
  const currentMedia = usePlayerStore((s) => s.currentMedia);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);
  const reduceMotion = useReducedMotion();

  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const [announcedLine, setAnnouncedLine] = useState('');
  const requestGeneration = useRef(0);

  const scrollRef = useRef<ScrollView>(null);
  const lineOffsets = useRef<number[]>([]);
  const viewportHeight = useRef(0);
  const lastScrolledIndex = useRef(-1);
  const lastAnnouncementTime = useRef(-ANNOUNCEMENT_INTERVAL_SECONDS);

  useEffect(() => {
    let alive = true;
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    setLyrics(null);
    setError(null);
    lineOffsets.current = [];
    lastScrolledIndex.current = -1;
    lastAnnouncementTime.current = -ANNOUNCEMENT_INTERVAL_SECONDS;
    setAutoFollow(true);
    setAnnouncedLine('');
    if (!currentMedia) return;
    setLoading(true);
    fetchLyrics(currentMedia)
      .then((result) => {
        if (alive && generation === requestGeneration.current) setLyrics(result);
      })
      .catch((caught) => {
        if (alive && generation === requestGeneration.current) {
          setError(caught instanceof Error ? caught.message : 'Lyrics could not be loaded.');
        }
      })
      .finally(() => alive && generation === requestGeneration.current && setLoading(false));
    return () => {
      alive = false;
    };
  }, [currentMedia?.id]);

  async function retry() {
    if (!currentMedia || loading) return;
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLyrics(currentMedia, { forceRefresh: true });
      if (generation === requestGeneration.current) setLyrics(result);
    } catch (caught) {
      if (generation === requestGeneration.current) {
        setError(caught instanceof Error ? caught.message : 'Lyrics could not be loaded.');
      }
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }

  const activeIndex = useMemo(() => {
    if (!lyrics?.synced?.length) return -1;
    const t = currentTime + SYNC_LEAD_SECONDS;
    let index = -1;
    for (let i = 0; i < lyrics.synced.length; i++) {
      if (lyrics.synced[i].time <= t) index = i;
      else break;
    }
    return index;
  }, [lyrics, currentTime]);

  useEffect(() => {
    if (!autoFollow || activeIndex < 0 || activeIndex === lastScrolledIndex.current) return;
    const offset = lineOffsets.current[activeIndex];
    if (offset === undefined || !viewportHeight.current) return;
    lastScrolledIndex.current = activeIndex;
    scrollRef.current?.scrollTo({
      y: Math.max(0, offset - viewportHeight.current * 0.4),
      animated: !reduceMotion,
    });
  }, [activeIndex, autoFollow, reduceMotion]);

  useEffect(() => {
    if (activeIndex < 0 || !lyrics?.synced?.[activeIndex]) return;
    if (currentTime - lastAnnouncementTime.current < ANNOUNCEMENT_INTERVAL_SECONDS) return;
    lastAnnouncementTime.current = currentTime;
    setAnnouncedLine(lyrics.synced[activeIndex].text);
  }, [activeIndex, currentTime, lyrics]);

  function resumeFollowing() {
    lastScrolledIndex.current = -1;
    setAutoFollow(true);
  }

  function seekToLine(index: number) {
    const line = lyrics?.synced?.[index];
    if (!line) return;
    seek(line.time);
    lastAnnouncementTime.current = line.time;
    setAnnouncedLine(line.text);
  }

  if (!currentMedia) return null;

  if (loading && !lyrics) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={colors.cyan} />
        <Text style={styles.stateText}>Finding the words…</Text>
      </View>
    );
  }

  if (error && !lyrics) {
    return (
      <View style={styles.stateWrap} accessibilityRole="alert">
        <Ionicons name="cloud-offline-outline" size={28} color={colors.warning} />
        <Text style={styles.errorTitle}>Lyrics could not be loaded</Text>
        <Text style={styles.stateText}>{error}</Text>
        <Button label="Retry lyrics" icon="refresh-outline" onPress={() => void retry()} />
      </View>
    );
  }

  if (!lyrics || (!lyrics.synced?.length && !lyrics.plain)) {
    return (
      <View style={styles.stateWrap}>
        <Ionicons name="text-outline" size={26} color={colors.textMuted} />
        <Text style={styles.stateText}>No lyrics found for this track.</Text>
      </View>
    );
  }

  if (lyrics.synced?.length) {
    return (
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => {
          viewportHeight.current = e.nativeEvent.layout.height;
        }}
        contentContainerStyle={styles.syncedContent}
        onScrollBeginDrag={() => setAutoFollow(false)}
      >
        <View style={styles.followRow}>
          <Text style={styles.followStatus}>{autoFollow ? 'Following the music' : 'Auto-follow paused'}</Text>
          {!autoFollow ? (
            <Pressable onPress={resumeFollowing} accessibilityRole="button" accessibilityLabel="Resume lyric auto-follow">
              <Text style={styles.retryText}>Resume</Text>
            </Pressable>
          ) : null}
        </View>
        <Text accessibilityLiveRegion="polite" accessibilityRole="text" style={styles.srCurrent}>
          {announcedLine ? `Current lyric: ${announcedLine}` : ''}
        </Text>
        {error ? (
          <View style={styles.cachedNotice} accessibilityLiveRegion="polite">
            <Ionicons name="warning-outline" size={17} color={colors.warning} />
            <Text style={styles.cachedNoticeText}>Showing saved lyrics. {error}</Text>
            <Pressable onPress={() => void retry()} accessibilityRole="button"><Text style={styles.retryText}>Retry</Text></Pressable>
          </View>
        ) : null}
        {lyrics.synced.map((line, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <Pressable
              key={`${line.time}-${i}`}
              onPress={() => seekToLine(i)}
              accessibilityRole="button"
              accessibilityLabel={`${line.text}. Seek to ${seekLabel(line.time)}`}
              accessibilityHint="Moves playback to this lyric"
              accessibilityState={{ selected: isActive }}
              onLayout={(e) => {
                lineOffsets.current[i] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.line, isPast && styles.linePast, isActive && styles.lineActive]}>
                {line.text}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.tail} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.plainContent}>
      {error ? (
        <View style={styles.cachedNotice} accessibilityLiveRegion="polite">
          <Ionicons name="warning-outline" size={17} color={colors.warning} />
          <Text style={styles.cachedNoticeText}>Showing saved lyrics. {error}</Text>
          <Pressable onPress={() => void retry()} accessibilityRole="button"><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : null}
      <Text style={styles.plain}>{lyrics.plain}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  syncedContent: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  line: {
    ...typography.subtitle,
    fontSize: 18,
    lineHeight: 26,
    color: 'rgba(158,181,170,0.6)',
  },
  linePast: {
    color: 'rgba(158,181,170,0.35)',
  },
  lineActive: {
    color: colors.textPrimary,
    fontFamily: 'Sora_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },
  tail: { height: 160 },
  plainContent: { padding: spacing.lg },
  plain: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  stateText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  errorTitle: { ...typography.subtitle, color: colors.textPrimary, textAlign: 'center' },
  cachedNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.md, borderRadius: 10, backgroundColor: 'rgba(242,183,93,0.08)' },
  cachedNoticeText: { ...typography.caption, flex: 1, color: colors.textSecondary },
  retryText: { ...typography.caption, fontFamily: 'Sora_600SemiBold', color: colors.cyan },
  followRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  followStatus: { ...typography.caption, fontSize: 11, color: colors.textMuted },
  srCurrent: { position: 'absolute', width: 1, height: 1, opacity: 0.01, overflow: 'hidden' },
});
