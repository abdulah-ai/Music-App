import AsyncStorage from '@react-native-async-storage/async-storage';

import type { User } from '../api/types';

const ACCOUNTS_KEY = 'sma.rememberedAccounts.v1';

export type RememberedAccount = {
  user: User;
  lastUsedAt: string;
};

function parseAccounts(raw: string | null): RememberedAccount[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RememberedAccount =>
        !!entry
        && typeof entry.lastUsedAt === 'string'
        && typeof entry.user?.id === 'string'
        && typeof entry.user?.email === 'string',
    );
  } catch {
    return [];
  }
}

async function save(accounts: RememberedAccount[]) {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

/**
 * Public account profiles remembered on this device. Passwords and session
 * tokens deliberately never enter this store: switching identities always
 * requires authentication before account-owned caches are hydrated again.
 */
export const accountStorage = {
  async list(): Promise<RememberedAccount[]> {
    const accounts = parseAccounts(await AsyncStorage.getItem(ACCOUNTS_KEY));
    return accounts.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));
  },

  async remember(user: User): Promise<RememberedAccount[]> {
    const current = await this.list();
    const next = [
      { user, lastUsedAt: new Date().toISOString() },
      ...current.filter((account) => account.user.id !== user.id),
    ];
    await save(next);
    return next;
  },

  async forget(userId: string): Promise<RememberedAccount[]> {
    const next = (await this.list()).filter((account) => account.user.id !== userId);
    await save(next);
    return next;
  },
};
