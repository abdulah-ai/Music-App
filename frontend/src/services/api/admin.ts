import { apiClient } from './client';

export type AdminStats = {
  total_users: number;
  total_media: number;
  audio_count: number;
  video_count: number;
  storage_bytes: number;
  jobs_by_status: Record<string, number>;
  recognition_success_rate: number | null;
  telegram_linked_users: number;
  signups_last_30_days: { date: string; count: number }[];
};

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  media_count: number;
  job_count: number;
  storage_bytes: number;
  telegram_linked: boolean;
  last_activity_at: string | null;
};

export type AdminJob = {
  id: string;
  user_id: string;
  user_email: string;
  job_type: string;
  status: string;
  source_url: string | null;
  error_message: string | null;
  created_at: string;
};

export type AdminEvent = {
  id: string;
  event_type: string;
  user_id: string | null;
  user_email: string | null;
  detail: string | null;
  created_at: string;
};

type Page<T> = { items: T[]; total: number };

export async function getStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>('/admin/stats');
  return data;
}

export async function getUsers(limit = 50, offset = 0): Promise<Page<AdminUser>> {
  const { data } = await apiClient.get<Page<AdminUser>>('/admin/users', { params: { limit, offset } });
  return data;
}

export async function getJobs(status?: string, limit = 50, offset = 0): Promise<Page<AdminJob>> {
  const { data } = await apiClient.get<Page<AdminJob>>('/admin/jobs', { params: { status, limit, offset } });
  return data;
}

export async function getLogs(eventType?: string, limit = 50, offset = 0): Promise<Page<AdminEvent>> {
  const { data } = await apiClient.get<Page<AdminEvent>>('/admin/logs', {
    params: { event_type: eventType, limit, offset },
  });
  return data;
}
