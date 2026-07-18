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
  open_feedback_count: number;
};

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  created_at: string;
  media_count: number;
  job_count: number;
  storage_bytes: number;
  telegram_linked: boolean;
  last_activity_at: string | null;
};

export type AdminFeedback = {
  id: string;
  user_id: string;
  user_email: string | null;
  message: string;
  status: 'open' | 'resolved';
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
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

export type Page<T> = { items: T[]; total: number };
export type SortOrder = 'asc' | 'desc';

export type AdminListQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
};

export async function getStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>('/admin/stats');
  return data;
}

export async function getUsers(query: AdminListQuery & { role?: 'admin' | 'user' } = {}): Promise<Page<AdminUser>> {
  const { limit = 50, offset = 0, search, sort, order, role } = query;
  // Search/sort are an endpoint-ready contract extension; paging is already supported by the API.
  const { data } = await apiClient.get<Page<AdminUser>>('/admin/users', { params: { limit, offset, search, sort, order, role } });
  return data;
}

export async function getJobs(query: AdminListQuery & { status?: string } = {}): Promise<Page<AdminJob>> {
  const { status, limit = 50, offset = 0, search, sort, order } = query;
  // Search/sort are an endpoint-ready contract extension; status and paging are supported today.
  const { data } = await apiClient.get<Page<AdminJob>>('/admin/jobs', { params: { status, limit, offset, search, sort, order } });
  return data;
}

export async function getLogs(query: AdminListQuery & { eventType?: string } = {}): Promise<Page<AdminEvent>> {
  const { eventType, limit = 50, offset = 0, search, sort, order } = query;
  // Search/sort are an endpoint-ready contract extension; event type and paging are supported today.
  const { data } = await apiClient.get<Page<AdminEvent>>('/admin/logs', {
    params: { event_type: eventType, limit, offset, search, sort, order },
  });
  return data;
}

export async function updateUser(
  userId: string,
  payload: { role?: 'admin' | 'user'; email?: string },
): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, payload);
  return data;
}

export async function getFeedback(
  query: AdminListQuery & { status?: 'open' | 'resolved' } = {},
): Promise<Page<AdminFeedback>> {
  const { status, limit = 50, offset = 0, search, sort, order } = query;
  // Search/sort are an endpoint-ready contract extension; status and paging are supported today.
  const { data } = await apiClient.get<Page<AdminFeedback>>('/admin/feedback', {
    params: { status, limit, offset, search, sort, order },
  });
  return data;
}

export async function updateFeedback(
  feedbackId: string,
  payload: { status?: 'open' | 'resolved'; admin_reply?: string },
): Promise<AdminFeedback> {
  const { data } = await apiClient.patch<AdminFeedback>(`/admin/feedback/${feedbackId}`, payload);
  return data;
}

export async function createAnnouncement(title: string, body: string): Promise<Announcement> {
  const { data } = await apiClient.post<Announcement>('/admin/announcements', { title, body });
  return data;
}

export async function listAnnouncementsAdmin(): Promise<Announcement[]> {
  const { data } = await apiClient.get<Announcement[]>('/admin/announcements');
  return data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await apiClient.delete(`/admin/announcements/${id}`);
}
