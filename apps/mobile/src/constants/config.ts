import Constants from 'expo-constants';

export const STAGING_API_URL = 'https://celebs-api-staging.onrender.com/api/v1';
export const STAGING_HOST = 'https://celebs-api-staging.onrender.com';

/**
 * Dynamically resolves the backend API base URL for Expo.
 * - In Development mode (__DEV__): Auto-extracts computer's LAN IP from Expo hostUri
 *   (e.g., http://192.168.1.X:3333/api/v1) or localhost if EXPO_PUBLIC_USE_LOCAL_API=true or EXPO_PUBLIC_API_URL is local.
 * - Otherwise falls back to EXPO_PUBLIC_API_URL or STAGING_API_URL.
 */
export function getDevBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const useLocal =
    process.env.EXPO_PUBLIC_USE_LOCAL_API === 'true' ||
    envUrl?.includes('localhost') ||
    envUrl?.includes('127.0.0.1');

  if (__DEV__ && useLocal) {
    const debuggerHost = Constants.expoConfig?.hostUri;
    const hostIp = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
    return `http://${hostIp}:3333/api/v1`;
  }

  if (envUrl) {
    return envUrl;
  }

  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri;
    const hostIp = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
    return `http://${hostIp}:3333/api/v1`;
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

export const GOOGLE_CLIENT_ID =
  '998383824177-mvfgjhqjqeq2dc1ecmunajarlgbjlo4m.apps.googleusercontent.com';

export const API_CONFIG = {
  baseURL: getDevBaseUrl(),
  timeout: 25000,
};
