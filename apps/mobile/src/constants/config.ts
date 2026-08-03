import Constants from 'expo-constants';

export const STAGING_API_URL = 'https://celebs-api-staging.onrender.com/api/v1';
export const STAGING_HOST = 'https://celebs-api-staging.onrender.com';

/**
 * Dynamically resolves the backend API base URL for Expo.
 * - If EXPO_PUBLIC_API_URL is explicitly set, uses it.
 * - In Development mode on physical device / Expo Go: Auto-extracts computer's LAN IP
 *   (e.g., http://192.168.1.X:3333/api/v1).
 * - Fallback: http://localhost:3333/api/v1
 */
export function getDevBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return STAGING_API_URL;
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/')) {
    const baseUrl = getDevBaseUrl().replace('/api/v1', '');
    return `${baseUrl}${url}`;
  }
  return url;
}

export const GOOGLE_CLIENT_ID = '998383824177-mvfgjhqjqeq2dc1ecmunajarlgbjlo4m.apps.googleusercontent.com';

export const API_CONFIG = {
  baseURL: getDevBaseUrl(),
  timeout: 25000,
};
