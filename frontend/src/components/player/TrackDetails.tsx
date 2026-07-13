import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Media } from '../../services/api/types';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { buildMediaDetailSections, type MediaDetailItem } from '../../utils/mediaDetails';
import { displayArtist, displayTitle } from '../../utils/mediaDisplay';
import { Artwork } from '../ui/Artwork';

const DETAIL_ICONS: Record<MediaDetailItem['key'], keyof typeof Ionicons.glyphMap> = {
  album: 'disc-outline',
  genre: 'pricetag-outline',
  released: 'calendar-outline',
  duration: 'time-outline',
  source: 'cloud-download-outline',
  imported: 'archive-outline',
  file: 'document-outline',
};

function DetailGrid({ items }: { items: MediaDetailItem[] }) {
  return (
    <View style={styles.grid} accessibilityRole="list">
      {items.map((item) => (
        <View
          key={item.key}
          accessible
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={styles.detailTile}
        >
          <View style={styles.detailIcon}>
            <Ionicons name={DETAIL_ICONS[item.key]} size={17} color={colors.cyan} />
          </View>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text numberOfLines={2} style={styles.detailValue}>{item.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function TrackDetails({ media }: { media: Media }) {
  const details = buildMediaDetailSections(media);
  const artist = displayArtist(media) ?? 'Unknown artist';

  return (
    <View style={styles.root}>
      <View style={styles.identity}>
        <Artwork media={media} size={64} borderRadius={radii.md} />
        <View style={styles.identityText}>
          <Text numberOfLines={2} style={styles.title}>{displayTitle(media)}</Text>
          <Text numberOfLines={1} style={styles.artist}>{artist}</Text>
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Ionicons
                name={media.media_type === 'video' ? 'videocam-outline' : 'musical-notes-outline'}
                size={12}
                color={colors.textSecondary}
              />
              <Text style={styles.chipLabel}>{media.media_type === 'video' ? 'Video' : 'Audio'}</Text>
            </View>
            {media.is_remix === true ? (
              <View style={[styles.chip, styles.remixChip]}>
                <Ionicons name="sparkles-outline" size={12} color={colors.gold} />
                <Text style={[styles.chipLabel, styles.remixLabel]}>Remix</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Music details</Text>
        {details.music.length > 0 ? (
          <DetailGrid items={details.music} />
        ) : (
          <View accessible accessibilityLabel="No album, genre, or release year yet" style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.emptyText}>No album, genre, or release year yet.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>File & source</Text>
        <DetailGrid items={details.archive} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg, paddingBottom: spacing.sm },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  identityText: { flex: 1, gap: 3 },
  title: { ...typography.subtitle, fontSize: 16, lineHeight: 21, color: colors.textPrimary },
  artist: { ...typography.caption, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceBright,
  },
  remixChip: { backgroundColor: 'rgba(245, 194, 107, 0.10)' },
  chipLabel: { ...typography.caption, fontSize: 10, color: colors.textSecondary },
  remixLabel: { color: colors.gold },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.eyebrow, fontSize: 10, letterSpacing: 1.5, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailTile: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 145,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(17, 30, 25, 0.54)',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 214, 181, 0.08)',
  },
  detailText: { flex: 1, minWidth: 0 },
  detailLabel: { ...typography.caption, fontSize: 10, color: colors.textMuted },
  detailValue: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textPrimary, marginTop: 2 },
  emptyState: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  emptyText: { ...typography.caption, flex: 1, color: colors.textMuted },
});
