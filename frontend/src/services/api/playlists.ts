import { apiClient } from './client';
import type { Playlist } from './types';

export async function listPlaylists(): Promise<Playlist[]> {
  const { data } = await apiClient.get<Playlist[]>('/playlists');
  return data;
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const { data } = await apiClient.post<Playlist>('/playlists', { name });
  return data;
}

/** R4 service hook: the server should persist playlist identity fields. */
export async function updatePlaylist(
  playlistId: string,
  payload: { name: string; artwork_url: string | null },
): Promise<Playlist> {
  const { data } = await apiClient.patch<Playlist>(`/playlists/${playlistId}`, payload);
  return data;
}

/** R4 service hook: persists the user's playlist shelf order. */
export async function reorderPlaylists(playlistIds: string[]): Promise<Playlist[]> {
  const { data } = await apiClient.put<Playlist[]>('/playlists/reorder', { playlist_ids: playlistIds });
  return data;
}

/** R4 service hook: persists track order within one playlist. */
export async function reorderPlaylistItems(playlistId: string, mediaIds: string[]): Promise<Playlist> {
  const { data } = await apiClient.put<Playlist>(`/playlists/${playlistId}/items/reorder`, { media_ids: mediaIds });
  return data;
}

export async function addToPlaylist(playlistId: string, mediaId: string): Promise<Playlist> {
  const { data } = await apiClient.post<Playlist>(`/playlists/${playlistId}/items`, { media_id: mediaId });
  return data;
}

export async function removeFromPlaylist(playlistId: string, mediaId: string): Promise<Playlist> {
  const { data } = await apiClient.delete<Playlist>(`/playlists/${playlistId}/items/${mediaId}`);
  return data;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  await apiClient.delete(`/playlists/${playlistId}`);
}
