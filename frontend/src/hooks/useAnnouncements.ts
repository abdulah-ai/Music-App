import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as feedbackApi from '../services/api/feedback';
import type { Announcement } from '../services/api/admin';
import { useAuthStore } from '../store/authStore';

const LAST_SEEN_KEY = 'sma.lastSeenAnnouncementId';

/**
 * The single newest announcement, if the signed-in device hasn't dismissed
 * it yet. Dismissal is keyed by announcement id (mirrors useAppUpdate) so a
 * later, genuinely new announcement still surfaces even if an older one was
 * already waved away.
 */
export function useLatestAnnouncement(): { announcement: Announcement | null; dismiss: () => void } {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setAnnouncement(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [items, lastSeenId] = await Promise.all([
          feedbackApi.listAnnouncements(),
          AsyncStorage.getItem(LAST_SEEN_KEY),
        ]);
        const latest = items[0] ?? null;
        if (!cancelled && latest && latest.id !== lastSeenId) {
          setAnnouncement(latest);
        }
      } catch {
        // Offline or backend unreachable — silently skip, not worth a retry loop for a notice banner.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  function dismiss() {
    if (!announcement) return;
    AsyncStorage.setItem(LAST_SEEN_KEY, announcement.id).catch(() => {});
    setAnnouncement(null);
  }

  return { announcement, dismiss };
}
