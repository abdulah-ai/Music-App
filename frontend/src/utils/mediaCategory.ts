import type { Media } from '../services/api/types';

export type MediaCategoryId =
  | 'pop'
  | 'hip-hop'
  | 'rock'
  | 'electronic'
  | 'rnb'
  | 'jazz'
  | 'classical'
  | 'country'
  | 'latin'
  | 'metal'
  | 'folk'
  | 'soundtracks'
  | 'other'
  | 'uncategorized';

export type MediaCategory = {
  id: MediaCategoryId;
  label: string;
  description: string;
  icon: string;
};

export const MEDIA_CATEGORIES: readonly MediaCategory[] = [
  { id: 'pop', label: 'Pop', description: 'Bright hooks and modern pop', icon: 'sparkles-outline' },
  { id: 'hip-hop', label: 'Hip-Hop & Rap', description: 'Rap, trap, and hip-hop', icon: 'mic-outline' },
  { id: 'rock', label: 'Rock', description: 'Alternative, indie, and rock', icon: 'flash-outline' },
  { id: 'electronic', label: 'Electronic & Dance', description: 'Electronic, house, and dance', icon: 'pulse-outline' },
  { id: 'rnb', label: 'R&B & Soul', description: 'R&B, soul, and funk', icon: 'heart-outline' },
  { id: 'jazz', label: 'Jazz', description: 'Jazz, swing, and blues', icon: 'musical-notes-outline' },
  { id: 'classical', label: 'Classical', description: 'Orchestral and classical', icon: 'library-outline' },
  { id: 'country', label: 'Country', description: 'Country and Americana', icon: 'trail-sign-outline' },
  { id: 'latin', label: 'Latin', description: 'Latin, reggaeton, and salsa', icon: 'sunny-outline' },
  { id: 'metal', label: 'Metal', description: 'Metal and its subgenres', icon: 'flame-outline' },
  { id: 'folk', label: 'Folk & Acoustic', description: 'Folk, acoustic, and singer-songwriter', icon: 'leaf-outline' },
  { id: 'soundtracks', label: 'Soundtracks', description: 'Scores, anime, and game music', icon: 'film-outline' },
  { id: 'other', label: 'Other', description: 'Recognized genres outside the main groups', icon: 'ellipsis-horizontal-circle-outline' },
  { id: 'uncategorized', label: 'Uncategorized', description: 'Tracks still waiting for genre details', icon: 'help-circle-outline' },
] as const;

const RULES: ReadonlyArray<[MediaCategoryId, RegExp]> = [
  ['hip-hop', /\b(hip[ -]?hop|rap|trap|grime|drill)\b/i],
  ['rnb', /\b(r\s*&\s*b|rnb|rhythm\s+and\s+blues|soul|funk|motown)\b/i],
  ['metal', /\b(metal|metalcore|deathcore|hardcore)\b/i],
  ['electronic', /\b(electro(?:nic)?|edm|dance|house|techno|trance|dubstep|drum\s*(?:and|&)\s*bass|ambient|synthwave)\b/i],
  ['classical', /\b(classical|orchestral|opera|baroque|romantic era|chamber music)\b/i],
  ['jazz', /\b(jazz|swing|bebop|blues)\b/i],
  ['country', /\b(country|americana|bluegrass|honky[ -]?tonk)\b/i],
  ['latin', /\b(latin|reggaeton|salsa|bachata|merengue|bossa nova|cumbia)\b/i],
  ['folk', /\b(folk|acoustic|singer[ -]?songwriter)\b/i],
  ['soundtracks', /\b(soundtrack|film score|original score|ost|anime|video game music)\b/i],
  ['rock', /\b(rock|alternative|indie|punk|grunge|shoegaze|emo)\b/i],
  ['pop', /\b(pop|k[ -]?pop|j[ -]?pop|synth[ -]?pop|dream pop)\b/i],
];

export function categoryForGenre(genre?: string | null): MediaCategoryId {
  const value = genre?.trim();
  if (!value) return 'uncategorized';
  return RULES.find(([, pattern]) => pattern.test(value))?.[0] ?? 'other';
}

export function groupMediaByCategory(items: readonly Media[]): Record<MediaCategoryId, Media[]> {
  const groups = MEDIA_CATEGORIES.reduce((result, { id }) => {
    result[id] = [];
    return result;
  }, {} as Record<MediaCategoryId, Media[]>);
  for (const media of items) groups[categoryForGenre(media.genre)].push(media);
  return groups;
}
