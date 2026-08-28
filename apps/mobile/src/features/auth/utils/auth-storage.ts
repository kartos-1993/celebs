import * as SecureStore from 'expo-secure-store';

import type { UserProfile } from '../types';

import { setAccessToken, setRefreshToken } from '@/api/client';

export type StoredUserProfile = UserProfile;

const TOKEN_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user_profile';

export async function restoreAuthSession(): Promise<{
  token: string | null;
  user: UserProfile | null;
}> {
  try {
    const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    const storedUserJson = await SecureStore.getItemAsync(USER_KEY);

    if (storedToken && storedUserJson) {
      setAccessToken(storedToken);
      return {
        token: storedToken,
        user: JSON.parse(storedUserJson),
      };
    }
  } catch (err) {
    console.warn('Failed to restore auth session:', err);
  }
  return { token: null, user: null };
}

export async function saveAuthSession(
  newToken: string,
  newUser: UserProfile,
  refreshToken?: string,
): Promise<void> {
  setAccessToken(newToken);
  await SecureStore.setItemAsync(TOKEN_KEY, newToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
  if (refreshToken) {
    await setRefreshToken(refreshToken);
  }
}

export async function clearAuthSession(): Promise<void> {
  setAccessToken(null);
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch (e) {
    console.warn('Failed to clear stored auth session:', e);
  }
}

// Backward-compatibility aliases
export const restoreStoredSession = restoreAuthSession;
export const persistSession = saveAuthSession;
export const purgeStoredSession = clearAuthSession;
