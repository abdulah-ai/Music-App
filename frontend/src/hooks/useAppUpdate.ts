import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { APP_VERSION_CODE } from '../config';

const GITHUB_RELEASE_API = 'https://api.github.com/repos/3boodabbas2026-debug/Music-App/releases/tags/apk-latest';
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export type UpdateInfo = {
  available: boolean;
  /** Identifies *which* update this is, so dismissing one doesn't hide a later, genuinely newer one. */
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  apply: () => void;
};

const NONE: UpdateInfo = {
  available: false,
  id: '',
  title: '',
  detail: '',
  actionLabel: '',
  apply: () => {},
};

/**
 * Web: the service worker already downloads and activates new bundles in the
 * background (see public/sw.js — skipWaiting + clients.claim on every
 * deploy). The only thing missing is telling the user it happened — the
 * page's *running* JS is still the old bundle until something reloads it.
 * `controllerchange` fires exactly once when a new worker takes over; we
 * ignore the very first firing (that's just this page's own initial
 * activation, not an update) and treat every firing after that as "a newer
 * version just took control — tap to actually start running it."
 */
function useWebUpdate(): UpdateInfo {
  const [available, setAvailable] = useState(false);
  const sawInitialControllerRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    sawInitialControllerRef.current = !!navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (!sawInitialControllerRef.current) {
        sawInitialControllerRef.current = true;
        return;
      }
      setAvailable(true);
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Browsers only check for a new service worker on navigation — poke it
    // manually so a tab left open for a while still notices a new deploy.
    const poke = () => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update().catch(() => {}));
    };
    poke();
    const interval = setInterval(poke, 5 * 60 * 1000);
    window.addEventListener('focus', poke);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearInterval(interval);
      window.removeEventListener('focus', poke);
    };
  }, []);

  if (!available) return NONE;
  return {
    available: true,
    id: 'web-update',
    title: 'A new version is ready',
    detail: 'Tap to refresh — it only takes a second',
    actionLabel: 'Refresh',
    apply: () => window.location.reload(),
  };
}

/**
 * The APK is sideloaded (no Play Store), so there's no push-update channel —
 * we poll the same GitHub release the CI workflow publishes to and compare
 * its version.json against the versionCode this build was compiled with.
 * Tapping the banner opens the APK download directly; Android still requires
 * its own one-tap "Install this app?" confirmation before an update actually
 * lands — that step belongs to the OS and can't be skipped for an app
 * installed outside the Play Store.
 */
function useApkUpdate(): UpdateInfo {
  const [remote, setRemote] = useState<{ versionCode: number; apkUrl: string } | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__) return;
    let cancelled = false;

    async function check() {
      try {
        const releaseRes = await fetch(GITHUB_RELEASE_API);
        if (!releaseRes.ok) return;
        const release = await releaseRes.json();
        const asset = (release.assets ?? []).find((a: { name: string }) => a.name === 'version.json');
        if (!asset) return;
        const versionRes = await fetch(asset.browser_download_url);
        if (!versionRes.ok) return;
        const version = await versionRes.json();
        if (!cancelled && typeof version.versionCode === 'number' && typeof version.apkUrl === 'string') {
          setRemote(version);
        }
      } catch {
        // Offline, or GitHub unreachable — silently retry on the next interval.
      }
    }
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!remote || remote.versionCode <= APP_VERSION_CODE) return NONE;
  return {
    available: true,
    id: `apk-${remote.versionCode}`,
    title: 'An updated app is ready',
    detail: "Tap to download — Android will ask you to confirm the install once",
    actionLabel: 'Download',
    apply: () => {
      Linking.openURL(remote.apkUrl);
    },
  };
}

export function useAppUpdate(): UpdateInfo {
  const web = useWebUpdate();
  const apk = useApkUpdate();
  return Platform.OS === 'web' ? web : apk;
}
