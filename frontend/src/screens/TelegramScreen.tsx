import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { GlassPanel } from '../components/ui/GlassPanel';
import { GradientText } from '../components/ui/GradientText';
import { PressableScale } from '../components/ui/PressableScale';
import { ProgressRing } from '../components/ui/ProgressRing';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { TextField } from '../components/ui/TextField';
import * as telegramApi from '../services/api/telegram';
import { watchJob } from '../services/api/jobSocket';
import type { Job } from '../services/api/types';
import { useLibraryStore } from '../store/libraryStore';
import { toast } from '../store/toastStore';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Telegram'>;

type LinkPhase = 'loading' | 'setup' | 'code' | 'password' | 'linked';

const LIMITS: Array<{ label: string; value: number | null }> = [
  { label: '25', value: 25 },
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '2,000', value: 2000 },
  { label: 'All', value: null },
];

export function TelegramScreen({ navigation }: Props) {
  const refreshLibrary = useLibraryStore((s) => s.refresh);

  const [phase, setPhase] = useState<LinkPhase>('loading');
  const [phone, setPhone] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerTab, setPickerTab] = useState<'chats' | 'folders'>('chats');
  const [dialogs, setDialogs] = useState<telegramApi.TelegramDialog[] | null>(null);
  const [dialogQuery, setDialogQuery] = useState('');
  const [selectedChats, setSelectedChats] = useState<Record<string, telegramApi.TelegramDialog>>({});
  const [folders, setFolders] = useState<telegramApi.TelegramFolder[] | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<telegramApi.TelegramFolder | null>(null);
  const [mediaKind, setMediaKind] = useState<'music' | 'video'>('music');
  const [limit, setLimit] = useState<number | null>(25);
  const [importJob, setImportJob] = useState<Job | null>(null);
  const unsubscribeImport = useRef<(() => void) | null>(null);

  function toggleChat(dialog: telegramApi.TelegramDialog) {
    setSelectedFolder(null);
    setSelectedChats((prev) => {
      const next = { ...prev };
      if (next[dialog.id]) delete next[dialog.id];
      else next[dialog.id] = dialog;
      return next;
    });
  }

  function pickFolder(folder: telegramApi.TelegramFolder) {
    setSelectedChats({});
    setSelectedFolder((prev) => (prev?.id === folder.id ? null : folder));
  }

  useEffect(() => {
    let alive = true;
    telegramApi
      .getStatus()
      .then((status) => {
        if (!alive) return;
        if (status.phone) setPhone(status.phone);
        setPhase(status.authorized ? 'linked' : 'setup');
      })
      .catch(() => alive && setPhase('setup'));
    return () => {
      alive = false;
      unsubscribeImport.current?.();
    };
  }, []);

  function fail(err: unknown, fallback: string) {
    const detail = (err as any)?.response?.data?.detail;
    setError(typeof detail === 'string' ? detail : fallback);
  }

  async function handleConnect() {
    setError(null);
    setBusy(true);
    try {
      await telegramApi.saveSettings(Number(apiId.trim()), apiHash.trim(), phone.trim());
      const result = await telegramApi.sendCode();
      if (result.status === 'authorized') setPhase('linked');
      else setPhase('code');
    } catch (err) {
      fail(err, "Couldn't reach Telegram with those keys.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    setBusy(true);
    try {
      const result = await telegramApi.verifyCode(code.trim());
      if (result.status === 'authorized') {
        setPhase('linked');
        toast('Telegram linked', 'success');
      } else if (result.status === 'password_required') {
        setPhase('password');
      }
    } catch (err) {
      fail(err, "That code didn't work — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyPassword() {
    setError(null);
    setBusy(true);
    try {
      await telegramApi.verifyPassword(password);
      setPhase('linked');
      toast('Telegram linked', 'success');
    } catch (err) {
      fail(err, "That password didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function loadDialogs() {
    setError(null);
    setBusy(true);
    try {
      const [dialogList, folderList] = await Promise.all([
        telegramApi.listDialogs(),
        telegramApi.listFolders().catch(() => []),
      ]);
      setDialogs(dialogList);
      setFolders(folderList);
    } catch (err) {
      fail(err, "Couldn't load your chats.");
    } finally {
      setBusy(false);
    }
  }

  const selectedChatList = useMemo(() => Object.values(selectedChats), [selectedChats]);

  async function handleImport() {
    if (!selectedFolder && selectedChatList.length === 0) return;
    setError(null);
    try {
      const target: telegramApi.ImportTarget = selectedFolder
        ? { folderId: selectedFolder.id }
        : { chats: selectedChatList.map((d) => d.username ?? d.id) };
      const job = await telegramApi.startImport(target, mediaKind, limit);
      setImportJob(job);
      unsubscribeImport.current?.();
      unsubscribeImport.current = watchJob(job.id, (update) => {
        setImportJob(update);
        if (update.status === 'complete') {
          toast(update.stage_label ?? 'Import complete', 'success');
          refreshLibrary();
        }
        if (update.status === 'failed') {
          toast(update.error_message ?? 'Import failed', 'error');
        }
      });
    } catch (err) {
      fail(err, "Couldn't start that import.");
    }
  }

  const filteredDialogs = useMemo(() => {
    if (!dialogs) return null;
    const q = dialogQuery.trim().toLowerCase();
    const list = q ? dialogs.filter((d) => d.title.toLowerCase().includes(q)) : dialogs;
    return list.slice(0, 30);
  }, [dialogs, dialogQuery]);

  const importing = importJob && (importJob.status === 'pending' || importJob.status === 'in_progress');

  return (
    <View style={styles.root}>
      <ScreenContainer maxWidth={760}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>DIRECT INTAKE</Text>
            <GradientText style={styles.megaTitle}>Telegram</GradientText>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {phase === 'loading' && <ActivityIndicator color={colors.cyan} style={styles.loading} />}

          {phase === 'setup' && (
            <GlassPanel style={styles.panel}>
              <View style={styles.panelContent}>
                <Text style={styles.panelTitle}>Link your account</Text>
                <Text style={styles.hint}>
                  Grab an API ID + hash from my.telegram.org → API development tools, then enter your phone.
                </Text>
                <TextField label="API ID" value={apiId} onChangeText={setApiId} keyboardType="numeric" placeholder="1234567" />
                <TextField label="API Hash" value={apiHash} onChangeText={setApiHash} autoCapitalize="none" placeholder="a1b2c3…" />
                <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+90…" />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <ActionButton
                  label="Send login code"
                  busy={busy}
                  disabled={!apiId.trim() || !apiHash.trim() || !phone.trim()}
                  onPress={handleConnect}
                />
              </View>
            </GlassPanel>
          )}

          {phase === 'code' && (
            <GlassPanel style={styles.panel}>
              <View style={styles.panelContent}>
                <Text style={styles.panelTitle}>Enter the code</Text>
                <Text style={styles.hint}>Telegram sent a login code to {phone}.</Text>
                <TextField label="Code" value={code} onChangeText={setCode} keyboardType="numeric" placeholder="12345" />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <ActionButton label="Verify" busy={busy} disabled={!code.trim()} onPress={handleVerifyCode} />
              </View>
            </GlassPanel>
          )}

          {phase === 'password' && (
            <GlassPanel style={styles.panel}>
              <View style={styles.panelContent}>
                <Text style={styles.panelTitle}>Two-step verification</Text>
                <Text style={styles.hint}>Your account has a 2FA password — enter it to finish linking.</Text>
                <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <ActionButton label="Unlock" busy={busy} disabled={!password} onPress={handleVerifyPassword} />
              </View>
            </GlassPanel>
          )}

          {phase === 'linked' && (
            <>
              <GlassPanel style={styles.panel}>
                <View style={styles.panelContent}>
                  <View style={styles.linkedRow}>
                    <View style={styles.linkedBadge}>
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelTitle}>Linked{phone ? ` · ${phone}` : ''}</Text>
                      <Text style={styles.hint}>Pull music or video straight from any chat into your library.</Text>
                    </View>
                  </View>

                  {!dialogs ? (
                    <ActionButton label="Load my chats" busy={busy} onPress={loadDialogs} />
                  ) : (
                    <>
                      <View style={styles.chipRow}>
                        <Pressable
                          onPress={() => setPickerTab('chats')}
                          style={[styles.chip, pickerTab === 'chats' && styles.chipActive]}
                        >
                          <Text style={[styles.chipLabel, pickerTab === 'chats' && styles.chipLabelActive]}>
                            Chats{selectedChatList.length > 0 ? ` (${selectedChatList.length})` : ''}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setPickerTab('folders')}
                          style={[styles.chip, pickerTab === 'folders' && styles.chipActive]}
                        >
                          <Text style={[styles.chipLabel, pickerTab === 'folders' && styles.chipLabelActive]}>
                            Folders{folders?.length ? ` (${folders.length})` : ''}
                          </Text>
                        </Pressable>
                      </View>

                      {pickerTab === 'chats' ? (
                        <>
                          <Text style={styles.hint}>Tap to select one or more chats — imports pull from all of them.</Text>
                          <View style={styles.searchCapsule}>
                            <Ionicons name="search" size={15} color={colors.textMuted} />
                            <TextInput
                              value={dialogQuery}
                              onChangeText={setDialogQuery}
                              placeholder="Search chats"
                              placeholderTextColor={colors.textMuted}
                              selectionColor={colors.cyan}
                              style={styles.searchInput}
                            />
                          </View>
                          <View style={styles.dialogList}>
                            {filteredDialogs?.map((dialog) => {
                              const active = Boolean(selectedChats[dialog.id]);
                              return (
                                <Pressable
                                  key={dialog.id}
                                  onPress={() => toggleChat(dialog)}
                                  style={[styles.dialogRow, active && styles.dialogRowActive]}
                                >
                                  <Ionicons
                                    name={active ? 'checkbox' : 'square-outline'}
                                    size={16}
                                    color={active ? colors.cyan : colors.textMuted}
                                  />
                                  <Text numberOfLines={1} style={[styles.dialogTitle, active && styles.dialogTitleActive]}>
                                    {dialog.title}
                                  </Text>
                                  {dialog.username ? <Text style={styles.dialogHandle}>@{dialog.username}</Text> : null}
                                </Pressable>
                              );
                            })}
                            {filteredDialogs?.length === 0 && <Text style={styles.hint}>No chats match that search.</Text>}
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={styles.hint}>Import every chat inside one of your Telegram folders at once.</Text>
                          <View style={styles.dialogList}>
                            {folders?.map((folder) => {
                              const active = selectedFolder?.id === folder.id;
                              return (
                                <Pressable
                                  key={folder.id}
                                  onPress={() => pickFolder(folder)}
                                  style={[styles.dialogRow, active && styles.dialogRowActive]}
                                >
                                  <Ionicons
                                    name={active ? 'radio-button-on' : 'radio-button-off'}
                                    size={16}
                                    color={active ? colors.cyan : colors.textMuted}
                                  />
                                  <Text numberOfLines={1} style={[styles.dialogTitle, active && styles.dialogTitleActive]}>
                                    {folder.title}
                                  </Text>
                                  <Text style={styles.dialogHandle}>{folder.chat_count} chats</Text>
                                </Pressable>
                              );
                            })}
                            {folders?.length === 0 && (
                              <Text style={styles.hint}>You don't have any custom folders in Telegram yet.</Text>
                            )}
                          </View>
                        </>
                      )}
                    </>
                  )}
                </View>
              </GlassPanel>

              {(selectedFolder || selectedChatList.length > 0) && (
                <GlassPanel style={styles.panel}>
                  <View style={styles.panelContent}>
                    <Text style={styles.panelTitle} numberOfLines={1}>
                      {selectedFolder
                        ? `Import folder "${selectedFolder.title}" (${selectedFolder.chat_count} chats)`
                        : selectedChatList.length === 1
                          ? `Import from ${selectedChatList[0].title}`
                          : `Import from ${selectedChatList.length} chats`}
                    </Text>
                    <View style={styles.chipRow}>
                      {(['music', 'video'] as const).map((kind) => (
                        <Pressable
                          key={kind}
                          onPress={() => setMediaKind(kind)}
                          style={[styles.chip, mediaKind === kind && styles.chipActive]}
                        >
                          <Ionicons
                            name={kind === 'music' ? 'musical-notes' : 'videocam'}
                            size={13}
                            color={mediaKind === kind ? colors.cyan : colors.textMuted}
                          />
                          <Text style={[styles.chipLabel, mediaKind === kind && styles.chipLabelActive]}>
                            {kind === 'music' ? 'Music' : 'Video'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.chipRow}>
                      {LIMITS.map(({ label, value }) => (
                        <Pressable
                          key={label}
                          onPress={() => setLimit(value)}
                          style={[styles.chip, limit === value && styles.chipActive]}
                        >
                          <Text style={[styles.chipLabel, limit === value && styles.chipLabelActive]}>
                            {value === null ? 'All' : `${label} files`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {!importing && <ActionButton label="Start import" busy={false} onPress={handleImport} />}
                  </View>
                </GlassPanel>
              )}

              {importJob && (
                <GlassPanel style={styles.panel}>
                  <View style={[styles.panelContent, styles.jobRow]}>
                    {importing ? (
                      <ProgressRing progress={importJob.progress_pct / 100} size={48} strokeWidth={4}>
                        <Text style={styles.jobPct}>{Math.round(importJob.progress_pct)}</Text>
                      </ProgressRing>
                    ) : (
                      <View style={[styles.linkedBadge, importJob.status === 'failed' && styles.failedBadge]}>
                        <Ionicons
                          name={importJob.status === 'complete' ? 'checkmark' : 'close'}
                          size={16}
                          color={importJob.status === 'failed' ? colors.danger : colors.success}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.panelTitle}>
                        {importJob.source_url?.replace('telegram:', '') ?? 'Import'}
                      </Text>
                      <Text numberOfLines={2} style={styles.hint}>
                        {importJob.status === 'failed'
                          ? importJob.error_message
                          : `${importJob.stage_label ?? 'starting'}${importing ? '…' : ''}`}
                      </Text>
                    </View>
                    {importing && <ActivityIndicator size="small" color={colors.cyan} />}
                  </View>
                </GlassPanel>
              )}
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} disabled={busy || disabled} scaleTo={0.97}>
      <LinearGradient colors={colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.action}>
        {busy ? <ActivityIndicator size="small" color="#0A0F0D" /> : <Text style={styles.actionLabel}>{label}</Text>}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050805' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(18,28,24,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  eyebrow: { ...typography.eyebrow, color: colors.cyan, marginBottom: 2 },
  megaTitle: { ...typography.mega, fontSize: 34, lineHeight: 40 },
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  loading: { marginTop: spacing.xxl },
  panel: {},
  panelContent: { padding: spacing.lg, gap: spacing.md },
  panelTitle: { ...typography.title, fontSize: 19, lineHeight: 24, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger },
  action: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { ...typography.subtitle, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#0A0F0D' },
  linkedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  linkedBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(95,191,142,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedBadge: { backgroundColor: 'rgba(224,104,95,0.12)' },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(5,8,5,0.6)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: { ...typography.body, flex: 1, color: colors.textPrimary, paddingVertical: 0 },
  dialogList: { gap: 2 },
  dialogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  dialogRowActive: { backgroundColor: 'rgba(47,191,170,0.10)' },
  dialogTitle: { ...typography.body, color: colors.textSecondary, flex: 1 },
  dialogTitleActive: { color: colors.textPrimary },
  dialogHandle: { ...typography.caption, fontSize: 11, color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(5,8,5,0.5)',
  },
  chipActive: { backgroundColor: 'rgba(47,191,170,0.16)' },
  chipLabel: { ...typography.caption, color: colors.textMuted },
  chipLabelActive: { color: colors.cyan, fontFamily: 'SpaceGrotesk_500Medium' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  jobPct: { ...typography.caption, fontSize: 11, color: colors.cyan, fontFamily: 'SpaceGrotesk_600SemiBold' },
});
