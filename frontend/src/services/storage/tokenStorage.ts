import AsyncStorage from '@react-native-async-storage/async-storage';

import type { User } from '../api/types';

const ACCESS_KEY = 'sma.accessToken';
const REFRESH_KEY = 'sma.refreshToken';
const USER_KEY = 'sma.cachedUser';

export const tokenStorage = {
  async getAccessToken() {
    return AsyncStorage.getItem(ACCESS_KEY);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(REFRESH_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string) {
    await AsyncStorage.multiSet([
      [ACCESS_KEY, accessToken],
      [REFRESH_KEY, refreshToken],
    ]);
  },
  async setAccessToken(accessToken: string) {
    await AsyncStorage.setItem(ACCESS_KEY, accessToken);
  },
  /** Last-known signed-in profile, so a session can be restored offline without a round trip to /auth/me. */
  async getCachedUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  async setCachedUser(user: User) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async clear() {
    await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY, USER_KEY]);
  },
};
