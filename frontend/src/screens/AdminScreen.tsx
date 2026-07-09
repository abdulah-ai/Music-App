import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import * as adminApi from '../services/api/admin';
import type { AdminEvent, AdminJob, AdminStats, AdminUser } from '../services/api/admin';
import { EmptyState } from '../components/ui/EmptyState';
import { GlassPanel } from '../components/ui/GlassPanel';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useAuthStore } from '../store/authStore';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Tab = 'overview' | 'users' | 'jobs' | 'logs';

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'overview', label: 'Overview', icon: 'speedometer-outline' },
  { key: 'users', label: 'Users', icon: 'people-outline' },
  { key: 'jobs', label: 'Jobs', icon: 'download-outline' },
  { key: 'logs', label: 'Logs', icon: 'list-outline' },
];

const EVENT_LABELS: Record<string, string> = {
  user_registered: 'New account',
  job_created: 'Job started',
  job_completed: 'Job completed',
  job_failed: 'Job failed',
  telegram_linked: 'Telegram linked',
  media_deleted: 'Media deleted',
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel style={styles.statTile}>
      <View style={styles.statTileInner}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </GlassPanel>
  );
}

/** A minimal sparkline: one bar per day, height relative to that window's busiest day. */
function SignupSparkline({ days }: { days: AdminStats['signups_last_30_days'] }) {
  if (days.length === 0) {
    return <Text style={styles.mutedLine}>No signups in the last 30 days.</Text>;
  }
  const max = Math.max(...days.map((d) => d.count));
  return (
    <View style={styles.sparkRow}>
      {days.map((d) => (
        <View key={d.date} style={styles.sparkBarTrack}>
          <View style={[styles.sparkBar, { height: `${Math.max(8, (d.count / max) * 100)}%` }]} />
        </View>
      ))}
    </View>
  );
}

function OverviewTab({ stats }: { stats: AdminStats }) {
  return (
    <View>
      <View style={styles.statsGrid}>
        <StatTile label="Users" value={String(stats.total_users)} />
        <StatTile label="Media items" value={String(stats.total_media)} />
        <StatTile label="Storage used" value={formatBytes(stats.storage_bytes)} />
        <StatTile label="Telegram linked" value={String(stats.telegram_linked_users)} />
      </View>

      <Text style={styles.sectionTitle}>LIBRARY BREAKDOWN</Text>
      <GlassPanel style={styles.panel}>
        <View style={styles.panelBody}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Audio tracks</Text>
            <Text style={styles.fieldValue}>{stats.audio_count}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Video files</Text>
            <Text style={styles.fieldValue}>{stats.video_count}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Recognition success rate</Text>
            <Text style={styles.fieldValue}>
              {stats.recognition_success_rate === null ? '—' : `${Math.round(stats.recognition_success_rate * 100)}%`}
            </Text>
          </View>
        </View>
      </GlassPanel>

      <Text style={styles.sectionTitle}>JOBS BY STATUS</Text>
      <GlassPanel style={styles.panel}>
        <View style={styles.panelBody}>
          {Object.entries(stats.jobs_by_status).length === 0 ? (
            <Text style={styles.mutedLine}>No jobs yet.</Text>
          ) : (
            Object.entries(stats.jobs_by_status).map(([status, count]) => (
              <View key={status} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{status}</Text>
                <Text style={styles.fieldValue}>{count}</Text>
              </View>
            ))
          )}
        </View>
      </GlassPanel>

      <Text style={styles.sectionTitle}>SIGNUPS · LAST 30 DAYS</Text>
      <GlassPanel style={styles.panel}>
        <View style={styles.panelBody}>
          <SignupSparkline days={stats.signups_last_30_days} />
        </View>
      </GlassPanel>
    </View>
  );
}

function UsersTab({ users }: { users: AdminUser[] }) {
  if (users.length === 0) {
    return <EmptyState title="No users yet" subtitle="Registered accounts will show up here." icon="people-outline" />;
  }
  return (
    <View style={styles.list}>
      {users.map((user) => (
        <GlassPanel key={user.id} style={styles.row}>
          <View style={styles.rowContent}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={1} style={styles.title}>
                {user.display_name}
              </Text>
              <Text numberOfLines={1} style={styles.subtitle}>
                {user.email}
              </Text>
              <Text style={styles.mutedLine}>
                {user.media_count} media · {user.job_count} jobs · {formatBytes(user.storage_bytes)}
                {user.telegram_linked ? ' · Telegram linked' : ''}
              </Text>
            </View>
            <Text style={styles.mutedLine}>
              {user.last_activity_at ? timeAgo(user.last_activity_at) : 'no activity'}
            </Text>
          </View>
        </GlassPanel>
      ))}
    </View>
  );
}

function JobsTab({ jobs }: { jobs: AdminJob[] }) {
  if (jobs.length === 0) {
    return <EmptyState title="No jobs yet" subtitle="Downloads and recognitions across every account will show up here." icon="download-outline" />;
  }
  return (
    <View style={styles.list}>
      {jobs.map((job) => (
        <GlassPanel key={job.id} style={styles.row}>
          <View style={styles.rowContent}>
            <View
              style={[
                styles.badge,
                { backgroundColor: job.status === 'failed' ? 'rgba(224,104,95,0.14)' : 'rgba(95,191,142,0.14)' },
              ]}
            >
              <Ionicons
                name={job.status === 'failed' ? 'alert-circle' : job.status === 'complete' ? 'checkmark-circle' : 'time-outline'}
                size={18}
                color={job.status === 'failed' ? colors.danger : colors.success}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={1} style={styles.title}>
                {job.job_type} · {job.status}
              </Text>
              <Text numberOfLines={1} style={styles.subtitle}>
                {job.user_email}
              </Text>
              <Text numberOfLines={1} style={[styles.mutedLine, job.status === 'failed' && { color: colors.danger }]}>
                {job.status === 'failed' && job.error_message ? job.error_message : job.source_url ?? '—'}
              </Text>
            </View>
            <Text style={styles.mutedLine}>{timeAgo(job.created_at)}</Text>
          </View>
        </GlassPanel>
      ))}
    </View>
  );
}

function LogsTab({ events }: { events: AdminEvent[] }) {
  if (events.length === 0) {
    return <EmptyState title="Nothing logged yet" subtitle="Signups, downloads, and other activity will show up here." icon="list-outline" />;
  }
  return (
    <View style={styles.list}>
      {events.map((event) => (
        <GlassPanel key={event.id} style={styles.row}>
          <View style={styles.rowContent}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={1} style={styles.title}>
                {EVENT_LABELS[event.event_type] ?? event.event_type}
              </Text>
              {event.user_email && (
                <Text numberOfLines={1} style={styles.subtitle}>
                  {event.user_email}
                </Text>
              )}
              {event.detail && (
                <Text numberOfLines={1} style={styles.mutedLine}>
                  {event.detail}
                </Text>
              )}
            </View>
            <Text style={styles.mutedLine}>{timeAgo(event.created_at)}</Text>
          </View>
        </GlassPanel>
      ))}
    </View>
  );
}

export function AdminScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isAdmin = useAuthStore((s) => s.user?.is_admin ?? false);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adminApi.getStats(), adminApi.getUsers(), adminApi.getJobs(), adminApi.getLogs()])
      .then(([statsRes, usersRes, jobsRes, logsRes]) => {
        setStats(statsRes);
        setUsers(usersRes.items);
        setJobs(jobsRes.items);
        setEvents(logsRes.items);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin, load]);

  // The nav entry that leads here is already hidden for everyone else — this
  // is just defense in depth for a typed-in URL on web. Every /admin/* call
  // is independently rejected server-side regardless of what this shows.
  if (!isAdmin) {
    return (
      <View style={styles.root}>
        <ScreenContainer maxWidth={800}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Admin</Text>
            <View style={{ width: 36 }} />
          </View>
          <EmptyState title="Not available" subtitle="This area is only visible to the app's admin account." icon="lock-closed-outline" />
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenContainer maxWidth={800}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Admin</Text>
            <Pressable onPress={load} hitSlop={12} style={styles.backButton}>
              <Ionicons name="refresh" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
              >
                <Ionicons name={t.icon} size={14} color={tab === t.key ? colors.cyan : colors.textMuted} />
                <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {loading || !stats ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.cyan} />
          ) : (
            <>
              {tab === 'overview' && <OverviewTab stats={stats} />}
              {tab === 'users' && <UsersTab users={users} />}
              {tab === 'jobs' && <JobsTab jobs={jobs} />}
              {tab === 'logs' && <LogsTab events={events} />}
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050805' },
  scroll: { paddingBottom: spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerTitle: { ...typography.title, fontSize: 20, color: colors.textPrimary },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(18,28,24,0.55)',
  },
  tabChipActive: { backgroundColor: 'rgba(47,191,170,0.16)' },
  tabLabel: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  tabLabelActive: { color: colors.cyan, fontFamily: 'SpaceGrotesk_500Medium' },
  sectionTitle: {
    ...typography.eyebrow,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statTile: { flexGrow: 1, flexBasis: 150, borderRadius: radii.lg },
  statTileInner: { padding: spacing.md, gap: 2 },
  statValue: { ...typography.title, fontSize: 22, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  statLabel: { ...typography.caption, color: colors.textMuted },
  panel: { borderRadius: radii.lg },
  panelBody: { padding: spacing.lg, gap: spacing.md },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  fieldLabel: { ...typography.body, color: colors.textMuted },
  fieldValue: { ...typography.subtitle, fontSize: 15, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  mutedLine: { ...typography.caption, color: colors.textMuted },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 60 },
  sparkBarTrack: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  sparkBar: { width: '100%', borderRadius: 2, backgroundColor: colors.cyan, minHeight: 4 },
  list: { gap: spacing.sm },
  row: { borderRadius: radii.lg },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  badge: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.subtitle, fontSize: 15, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary },
});
