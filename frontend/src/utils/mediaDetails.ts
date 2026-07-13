import type { Media, MediaSource } from '../services/api/types';

export type MediaDetailItem = {
  key: 'album' | 'genre' | 'released' | 'duration' | 'source' | 'imported' | 'file';
  label: string;
  value: string;
};

export type MediaDetailSections = {
  music: MediaDetailItem[];
  archive: MediaDetailItem[];
};

const SOURCE_LABELS: Record<MediaSource, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  instagram: 'Instagram',
  telegram: 'Telegram',
  other_url: 'Web import',
  recognized_upload: 'Identified recording',
};

function cleanValue(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

export function formatMediaDuration(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function formatMediaSource(source: MediaSource): string {
  return SOURCE_LABELS[source];
}

export function formatImportDate(value: string | null | undefined, locale?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatFileSummary(
  filename: string | null | undefined,
  mimeType: string | null | undefined,
  sizeBytes: number | null | undefined,
): string | null {
  const extension = cleanValue(filename)?.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toUpperCase();
  const mimeSubtype = cleanValue(mimeType)?.split('/').pop()?.replace(/^x-/, '').toUpperCase();
  const format = extension ?? mimeSubtype ?? null;
  const size = sizeBytes && Number.isFinite(sizeBytes) && sizeBytes > 0
    ? (() => {
        const megabytes = sizeBytes / (1024 * 1024);
        return megabytes < 1024
          ? `${megabytes.toFixed(megabytes < 10 ? 1 : 0)} MB`
          : `${(megabytes / 1024).toFixed(1)} GB`;
      })()
    : null;
  return [format, size].filter(Boolean).join(' · ') || null;
}

export function buildMediaDetailSections(media: Media, locale?: string): MediaDetailSections {
  const music: MediaDetailItem[] = [];
  const archive: MediaDetailItem[] = [];
  const album = cleanValue(media.album);
  const genre = cleanValue(media.genre);
  const duration = formatMediaDuration(media.duration_seconds);
  const imported = formatImportDate(media.created_at, locale);
  const file = formatFileSummary(media.original_filename, media.mime_type, media.file_size_bytes);

  if (album) music.push({ key: 'album', label: 'Album', value: album });
  if (genre) music.push({ key: 'genre', label: 'Genre', value: genre });
  if (media.release_year && Number.isInteger(media.release_year)) {
    music.push({ key: 'released', label: 'Released', value: String(media.release_year) });
  }

  if (duration) archive.push({ key: 'duration', label: 'Duration', value: duration });
  archive.push({ key: 'source', label: 'Source', value: formatMediaSource(media.source) });
  if (imported) archive.push({ key: 'imported', label: 'Added', value: imported });
  if (file) archive.push({ key: 'file', label: 'File', value: file });

  return { music, archive };
}
