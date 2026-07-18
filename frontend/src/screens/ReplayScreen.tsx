import { useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Artwork } from '../components/ui/Artwork';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { GlassPanel } from '../components/ui/GlassPanel';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { usePlayHistoryStore } from '../store/playHistoryStore';
import { toast } from '../store/toastStore';
import { colors, numericTypography, radii, spacing, typography } from '../theme/tokens';
import { displayArtist, displayTitle } from '../utils/mediaDisplay';
import type { RootStackParamList } from '../navigation/types';

const RANGE_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

/** A private, on-device listening recap. No playback history leaves the phone. */
export function ReplayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const libraryItems = useLibraryStore((state) => state.items);
  const playQueue = usePlayerStore((state) => state.playQueue);
  const events = usePlayHistoryStore((state) => state.events);
  const [range, setRange] = useState('30');
  const windowDays = Number(range);
  const libraryIds = useMemo(() => new Set(libraryItems.map((media) => media.id)), [libraryItems]);
  const { topTracks, topArtists, minutes, previousMinutes } = useMemo(() => {
    const now = Date.now();
    const span = windowDays * 86400000;
    const current = events.filter((event) => libraryIds.has(event.mediaId) && event.at >= now - span);
    const previous = events.filter((event) => libraryIds.has(event.mediaId) && event.at >= now - span * 2 && event.at < now - span);
    const byTrack = new Map<string, { event: (typeof events)[number]; count: number }>();
    const byArtist = new Map<string, number>();
    for (const event of current) {
      const existing = byTrack.get(event.mediaId);
      if (existing) existing.count += 1;
      else byTrack.set(event.mediaId, { event, count: 1 });
      byArtist.set(event.artist, (byArtist.get(event.artist) ?? 0) + 1);
    }
    return {
      topTracks: [...byTrack.values()].sort((a, b) => b.count - a.count || b.event.at - a.event.at).slice(0, 10),
      topArtists: [...byArtist.entries()].map(([artist, count]) => ({ artist, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      minutes: Math.round(current.reduce((sum, event) => sum + (event.durationSeconds || 180), 0) / 60),
      previousMinutes: Math.round(previous.reduce((sum, event) => sum + (event.durationSeconds || 180), 0) / 60),
    };
  }, [events, libraryIds, windowDays]);
  const hours = Math.floor(minutes / 60);
  const comparison = previousMinutes === 0
    ? (minutes > 0 ? 'A fresh listening streak' : 'No change from the previous window')
    : `${Math.abs(Math.round(((minutes - previousMinutes) / previousMinutes) * 100))}% ${minutes >= previousMinutes ? 'more' : 'less'} than the previous ${windowDays} days`;

  async function playTrack(mediaId: string) {
    const media = libraryItems.find((item) => item.id === mediaId);
    if (!media) return;
    await playQueue([media], 0);
    navigation.navigate('Player');
  }

  async function playAll() {
    const ranked = topTracks
      .map((entry) => libraryItems.find((item) => item.id === entry.event.mediaId))
      .filter((media): media is NonNullable<typeof media> => !!media && media.media_type === 'audio');
    if (ranked.length === 0) return;
    await playQueue(ranked, 0);
    navigation.navigate('Player', { panel: 'queue' });
  }

  async function shareReplay() {
    const leaders = topTracks.slice(0, 5).map((entry, index) => `${index + 1}. ${entry.event.title} — ${entry.count} plays`).join('\n');
    try {
      await Share.share({ message: `My Starhollow Replay · ${windowDays} days\n${minutes} minutes listened\n${comparison}\n\n${leaders}` });
    } catch {
      toast("Couldn't open sharing.", 'error');
    }
  }

  return (
    <View style={styles.root}>
      <ScreenContainer maxWidth={720}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.headerRow}>
            <IconButton icon="chevron-back" accessibilityLabel="Go back" onPress={() => navigation.goBack()} variant="surface" />
            <SectionHeader
              eyebrow="Your Replay"
              title={`Last ${windowDays} days`}
              subtitle="Built entirely from what plays on this device. Nothing leaves your library."
              style={styles.heroHeader}
              titleStyle={styles.hero}
            />
          </View>

          <SegmentedControl
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
            accessibilityLabel="Replay time range"
            style={styles.rangeControl}
          />

          <View style={styles.statsRow}>
            <GlassPanel style={styles.statTile}>
              <Text style={styles.statValue}>{hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`}</Text>
              <Text style={styles.statLabel}>listened</Text>
            </GlassPanel>
            <GlassPanel style={styles.statTile}>
              <Text style={styles.statValue}>{topTracks.reduce((sum, track) => sum + track.count, 0)}</Text>
              <Text style={styles.statLabel}>plays counted</Text>
            </GlassPanel>
            <GlassPanel style={styles.statTile}>
              <Text style={styles.statValue}>{topArtists.length}</Text>
              <Text style={styles.statLabel}>artists in rotation</Text>
            </GlassPanel>
          </View>
          <Text style={styles.comparison}>{comparison}</Text>

          {topTracks.length === 0 ? (
            <View style={styles.emptyBody}>
              <EmptyState
                icon="sparkles-outline"
                title="Nothing to replay yet"
                subtitle="Listen through a few tracks and your recap will start filling in here."
              />
            </View>
          ) : (
            <>
              <SectionHeader
                title="On repeat"
                subtitle="Your most-played tracks in this listening window."
                style={styles.sectionHeader}
                titleStyle={styles.sectionTitle}
              />
              <View style={styles.actions}>
                <Button label="Play all" icon="play" onPress={() => void playAll()} style={styles.actionButton} />
                <Button label="Share recap" icon="share-outline" variant="ghost" onPress={() => void shareReplay()} style={styles.actionButton} />
              </View>
              <View style={styles.list}>
                {topTracks.map((entry, index) => {
                  const media = libraryItems.find((item) => item.id === entry.event.mediaId);
                  const title = media ? displayTitle(media) : entry.event.title;
                  return (
                    <PressableScale
                      key={entry.event.mediaId}
                      onPress={() => playTrack(entry.event.mediaId)}
                      accessibilityLabel={`Play ${title}`}
                      scaleTo={0.99}
                    >
                      <GlassPanel style={styles.trackRow}>
                        <View style={styles.trackContent}>
                          <Text style={styles.rank}>{index + 1}</Text>
                          <Artwork
                            media={media ?? { id: entry.event.mediaId, title: entry.event.title, artist: entry.event.artist }}
                            size={44}
                          />
                          <View style={styles.trackCopy}>
                            <Text numberOfLines={1} style={styles.trackTitle}>
                              {title}
                            </Text>
                            <Text numberOfLines={1} style={styles.trackArtist}>
                              {media ? displayArtist(media) ?? entry.event.artist : entry.event.artist}
                            </Text>
                          </View>
                          <View style={styles.countChip}>
                            <Text style={styles.countText}>{entry.count}×</Text>
                          </View>
                        </View>
                      </GlassPanel>
                    </PressableScale>
                  );
                })}
              </View>

              {topArtists.length > 0 ? (
                <>
                  <SectionHeader title="Top artists" style={[styles.sectionHeader, styles.artistSection]} titleStyle={styles.sectionTitle} />
                  <View style={styles.list}>
                    {topArtists.map((entry, index) => (
                      <GlassPanel key={entry.artist} style={styles.artistRow}>
                        <View style={styles.trackContent}>
                          <Text style={styles.rank}>{index + 1}</Text>
                          <Text numberOfLines={1} style={[styles.trackTitle, styles.trackCopy]}>
                            {entry.artist}
                          </Text>
                          <View style={styles.countChip}>
                            <Text style={styles.countText}>{entry.count} plays</Text>
                          </View>
                        </View>
                      </GlassPanel>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.xl },
  heroHeader: { flex: 1 },
  hero: { ...typography.display, fontSize: 30, lineHeight: 37 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  rangeControl: { marginBottom: spacing.lg },
  statTile: { flex: 1, borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', gap: 2 },
  statValue: { ...numericTypography.total, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  comparison: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: -spacing.md, marginBottom: spacing.xl },
  emptyBody: { flex: 1, justifyContent: 'center' },
  sectionHeader: { marginBottom: spacing.sm },
  artistSection: { marginTop: spacing.xl },
  sectionTitle: { ...typography.title, fontSize: 18, lineHeight: 24, color: colors.textPrimary },
  list: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionButton: { flex: 1 },
  trackRow: { width: '100%', borderRadius: radii.lg },
  artistRow: { borderRadius: radii.lg },
  trackContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  trackCopy: { flex: 1, minWidth: 0 },
  rank: { ...numericTypography.rank, color: colors.textMuted, width: 20 },
  trackTitle: { ...typography.subtitle, fontSize: 15, color: colors.textPrimary },
  trackArtist: { ...typography.caption, color: colors.textMuted },
  countChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  countText: { ...numericTypography.total, fontSize: 11, lineHeight: 16, letterSpacing: 0.1, color: colors.gold },
});
