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

export const API_CONFIG = {
  baseURL: getDevBaseUrl(),
  timeout: 10000,
};

