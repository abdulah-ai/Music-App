import { WS_BASE_URL } from '../../config';
import { tokenStorage } from '../storage/tokenStorage';
import { getDownload } from './downloads';
import type { Job } from './types';

const TERMINAL: Job['status'][] = ['complete', 'failed', 'cancelled'];
const POLL_INTERVAL_MS = 1500;

/**
 * Subscribes to live progress while polling as a correctness fallback. Mobile
 * WebViews and backgrounded tabs can silently lose WebSockets; polling keeps
 * terminal completion/failure visible and stops automatically with the job.
 */
export function watchJob(jobId: string, onUpdate: (job: Job) => void): () => void {
  let socket: WebSocket | null = null;
  let cancelled = false;
  let terminal = false;
  let latestUpdatedAt = '';
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  const applyUpdate = (job: Job) => {
    if (cancelled || terminal || (latestUpdatedAt && job.updated_at < latestUpdatedAt)) return;
    latestUpdatedAt = job.updated_at;
    onUpdate(job);
    if (TERMINAL.includes(job.status)) {
      terminal = true;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
      socket?.close();
    }
  };

  const poll = async () => {
    if (cancelled || terminal) return;
    try {
      applyUpdate(await getDownload(jobId));
    } catch {
      // A transient network/auth failure is retried on the next interval.
    }
    if (!cancelled && !terminal) pollTimer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
  };

  void poll();

  void (async () => {
    const token = await tokenStorage.getAccessToken();
    if (cancelled || terminal || !token) return;
    socket = new WebSocket(`${WS_BASE_URL}/api/v1/ws/jobs/${jobId}?token=${encodeURIComponent(token)}`);
    socket.onmessage = (event) => {
      try {
        applyUpdate(JSON.parse(event.data) as Job);
      } catch {
        // Ignore malformed frames; polling remains active.
      }
    };
    socket.onerror = () => socket?.close();
  })();

  return () => {
    cancelled = true;
    if (pollTimer) clearTimeout(pollTimer);
    socket?.close();
  };
}
