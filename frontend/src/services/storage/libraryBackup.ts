import type { Media, Playlist } from '../api/types';
import * as libraryApi from '../api/library';
import * as offlineMedia from './offlineMedia';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useLibraryStore } from '../../store/libraryStore';
import { usePinStore } from '../../store/pinStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { usePlayHistoryStore, type PlayEvent } from '../../store/playHistoryStore';
import { useScanHistoryStore, type ScanEntry } from '../../store/scanHistoryStore';

export const BACKUP_VERSION = 1;
export const BACKUP_INCLUDES = [
  'library records and custom metadata',
  'playlists and track order',
  'favorites and pins',
  'listening history',
  'recognition history',
  'offline manifest (not media bytes)',
] as const;

type CustomMetadata = Pick<Media, 'id' | 'title' | 'artist' | 'album' | 'genre' | 'release_year' | 'is_remix'>;

export type StarhollowBackup = {
  format: 'starhollow-backup';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  includes: readonly string[];
  data: {
    media: Media[];
    customMetadata: CustomMetadata[];
    playlists: Array<Pick<Playlist, 'id' | 'name' | 'artwork_url'> & { mediaIds: string[] }>;
    favoriteIds: string[];
    pinnedIds: string[];
    listeningHistory: PlayEvent[];
    recognitionHistory: ScanEntry[];
    offlineManifest: offlineMedia.OfflineEntry[];
  };
};

export async function createBackup(): Promise<StarhollowBackup> {
  await Promise.all([
    useLibraryStore.getState().refresh(),
    usePlaylistStore.getState().refresh(),
  ]);
  const media = useLibraryStore.getState().items;
  const playlists = usePlaylistStore.getState().playlists;
  return {
    format: 'starhollow-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    includes: BACKUP_INCLUDES,
    data: {
      media,
      customMetadata: media.map(({ id, title, artist, album, genre, release_year, is_remix }) => ({ id, title, artist, album, genre, release_year, is_remix })),
      playlists: playlists.map(({ id, name, artwork_url, items }) => ({ id, name, artwork_url, mediaIds: items.map((item) => item.id) })),
      favoriteIds: Object.keys(useFavoritesStore.getState().ids),
      pinnedIds: usePinStore.getState().ids,
      listeningHistory: usePlayHistoryStore.getState().events,
      recognitionHistory: useScanHistoryStore.getState().entries,
      offlineManifest: await offlineMedia.listOffline(),
    },
  };
}

export function parseBackup(input: string): StarhollowBackup {
  const parsed: unknown = JSON.parse(input);
  if (!parsed || typeof parsed !== 'object') throw new Error('This file is not a Starhollow backup.');
  const backup = parsed as Partial<StarhollowBackup>;
  if (backup.format !== 'starhollow-backup' || backup.version !== BACKUP_VERSION || !backup.data) {
    throw new Error(`Unsupported backup format. Starhollow currently restores version ${BACKUP_VERSION}.`);
  }
  const data = backup.data as Partial<StarhollowBackup['data']>;
  for (const key of ['media', 'customMetadata', 'playlists', 'favoriteIds', 'pinnedIds', 'listeningHistory', 'recognitionHistory', 'offlineManifest'] as const) {
    if (!Array.isArray(data[key])) throw new Error(`Backup is missing ${key}.`);
  }
  return backup as StarhollowBackup;
}

export type RestoreResult = {
  metadataUpdated: number;
  playlistsRestored: number;
  localRecordsRestored: number;
  missingMedia: number;
  offlineManifestEntries: number;
};

/** Restores server-backed data through the existing API clients and device-only data through its owning stores. */
export async function restoreBackup(backup: StarhollowBackup): Promise<RestoreResult> {
  await useLibraryStore.getState().refresh();
  const current = useLibraryStore.getState().items;
  const currentIds = new Set(current.map((media) => media.id));
  let metadataUpdated = 0;
  for (const metadata of backup.data.customMetadata) {
    if (!currentIds.has(metadata.id)) continue;
    const updated = await libraryApi.updateMedia(metadata.id, {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      genre: metadata.genre,
      release_year: metadata.release_year,
      is_remix: metadata.is_remix,
    });
    useLibraryStore.getState().upsert(updated);
    metadataUpdated += 1;
  }

  const validFavorites = backup.data.favoriteIds.filter((id) => currentIds.has(id));
  const validPins = backup.data.pinnedIds.filter((id) => currentIds.has(id));
  await Promise.all([
    useFavoritesStore.getState().restore(validFavorites),
    usePinStore.getState().restore(validPins),
    usePlayHistoryStore.getState().restore(backup.data.listeningHistory),
    useScanHistoryStore.getState().restore(backup.data.recognitionHistory),
  ]);

  await usePlaylistStore.getState().refresh();
  let playlistsRestored = 0;
  for (const saved of backup.data.playlists) {
    let target = usePlaylistStore.getState().playlists.find((playlist) => playlist.name === saved.name);
    if (!target) target = await usePlaylistStore.getState().create(saved.name);
    if (saved.artwork_url !== undefined && target.artwork_url !== saved.artwork_url) {
      target = await usePlaylistStore.getState().update(target.id, { name: saved.name, artwork_url: saved.artwork_url ?? null });
    }
    await usePlaylistStore.getState().addItems(target.id, saved.mediaIds.filter((id) => currentIds.has(id)));
    playlistsRestored += 1;
  }

  return {
    metadataUpdated,
    playlistsRestored,
    localRecordsRestored: validFavorites.length + validPins.length + backup.data.listeningHistory.length + backup.data.recognitionHistory.length,
    missingMedia: backup.data.media.filter((media) => !currentIds.has(media.id)).length,
    offlineManifestEntries: backup.data.offlineManifest.length,
  };
}
