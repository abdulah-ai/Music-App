import { apiClient } from './client';
import type { AdminFeedback, Announcement } from './admin';

export async function submitFeedback(message: string): Promise<AdminFeedback> {
  const { data } = await apiClient.post<AdminFeedback>('/feedback', { message });
  return data;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<Announcement[]>('/feedback/announcements');
  return data;
}
