import axios from 'axios';

import { API_V1 } from '../../config';
import { tokenStorage } from '../storage/tokenStorage';

export const apiClient = axios.create({ baseURL: API_V1, timeout: 30000 });

let sessionGeneration = 0;

/**
 * Invalidate every request started for the previous identity. Network calls
 * cannot always be physically cancelled on every React Native platform, so
 * the generation check also prevents a late response from repopulating a
 * freshly-cleared store after an account switch.
 */
export function invalidateApiSession() {
  sessionGeneration += 1;
  refreshPromise = null;
}

apiClient.interceptors.request.use(async (config) => {
  (config as any)._sessionGeneration = sessionGeneration;
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
let authenticationExpiredHandler: (() => void) | null = null;

export function setAuthenticationExpiredHandler(handler: () => void) {
  authenticationExpiredHandler = handler;
}

async function refreshAccessToken(): Promise<string | null> {
  const generation = sessionGeneration;
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_V1}/auth/refresh`, { refresh_token: refreshToken });
    if (generation !== sessionGeneration) return null;
    await tokenStorage.setAccessToken(data.access_token);
    return data.access_token as string;
  } catch (error: any) {
    // A rejected refresh token genuinely ends the session. A timeout/offline
    // failure does not: keep the refresh token so reconnecting can recover.
    const status = error?.response?.status;
    if (generation === sessionGeneration && (status === 400 || status === 401 || status === 403)) {
      await tokenStorage.clear();
      authenticationExpiredHandler?.();
    }
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => {
    if ((response.config as any)._sessionGeneration !== sessionGeneration) {
      return Promise.reject(new axios.CanceledError('Discarded a response from the previous account'));
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    if (original && (original as any)._sessionGeneration !== sessionGeneration) {
      return Promise.reject(new axios.CanceledError('Discarded a response from the previous account'));
    }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
