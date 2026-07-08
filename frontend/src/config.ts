// On a physical device or a separate emulator, `localhost` refers to the
// device itself, not your dev machine — set EXPO_PUBLIC_API_BASE_URL to your
// machine's LAN IP (e.g. http://192.168.1.20:8095) in a .env file. Android
// emulators specifically can reach the host machine via 10.0.2.2.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8095';
export const API_V1 = `${API_BASE_URL}/api/v1`;
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
export const REGISTRATION_INVITE_REQUIRED = process.env.EXPO_PUBLIC_REGISTRATION_INVITE_REQUIRED === 'true';

// Baked in by CI at build time (the same GitHub Actions run number used for
// the Android versionCode) so an installed APK can compare itself against
// the latest published release and offer an in-app update. Defaults to 0 for
// local/dev builds, which never matches a real release, so the update
// banner never fires outside a genuine CI build.
export const APP_VERSION_CODE = Number(process.env.EXPO_PUBLIC_APP_VERSION_CODE ?? '0');
