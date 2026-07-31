import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getDevBaseUrl(): string {
  let url = process.env.EXPO_PUBLIC_API_URL;
  const debuggerHost = Constants.expoConfig?.hostUri;
  const host = debuggerHost ? debuggerHost.split(':')[0] : null;

  if (!url) {
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      url = `http://${host}:3333/api/v1`;
    } else if (Platform.OS === 'android') {
      url = 'http://10.0.2.2:3333/api/v1';
    } else {
      url = 'http://localhost:3333/api/v1';
    }
  }

  // Replace localhost/127.0.0.1 on mobile platforms with actual Expo host IP or Android loopback
  if (Platform.OS !== 'web' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      url = url.replace(/localhost|127\.0\.0\.1/g, host);
    } else if (Platform.OS === 'android') {
      url = url.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2');
    }
  }

  return url;
}

export function getExpoHostIp(): string | null {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) return debuggerHost.split(':')[0];
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    const match = envUrl.match(/http:\/\/(.*?):/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }
  return '192.168.1.70';
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  // Remote CDNs, Cloudflare R2, Cloudinary, Unsplash, or S3
  if (url.startsWith('https://') || url.startsWith('http://img.') || url.startsWith('http://res.cloudinary.com')) {
    return url;
  }
  const host = getExpoHostIp() || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  return url.replace(/localhost|127\.0\.0\.1|192\.168\.\d+\.\d+/g, host);
}

export const API_CONFIG = {
  baseURL: getDevBaseUrl(),
  timeout: 25000, // 25s timeout to handle staging cold starts gracefully
};


