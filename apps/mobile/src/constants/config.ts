export const STAGING_API_URL = 'https://celebs-api-staging.onrender.com/api/v1';
export const STAGING_HOST = 'https://celebs-api-staging.onrender.com';

export function getDevBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || STAGING_API_URL;
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/')) {
    return `${STAGING_HOST}${url}`;
  }
  return url;
}

export const API_CONFIG = {
  baseURL: getDevBaseUrl(),
  timeout: 25000,
};
