import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, getDevBaseUrl } from '../constants/config';
import { ApiError } from './types';

const TOKEN_KEY = 'auth_access_token';

/**
 * Dynamically resolve backend API base URL for Expo apps.
 */
export const getApiBaseUrl = (): string => {
  return getDevBaseUrl();
};

export const apiClient = axios.create({
  timeout: API_CONFIG.timeout,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

// Request Interceptor: Dynamically resolve baseURL per request + attach Auth Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig & { skipAuth?: boolean }) => {
    config.baseURL = getApiBaseUrl();
    console.log(`[apiClient] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`);

    if (!config.skipAuth) {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Failed to retrieve auth token from SecureStore:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Uniform error handling & 401 token cleanup
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const isPublicEndpoint = (error.config as AxiosError['config'] & { skipAuth?: boolean })
      ?.skipAuth;

    if (error.response?.status === 401 && !isPublicEndpoint) {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch (e) {
        console.warn('Failed to clear expired auth token:', e);
      }
    }

    const responseData = error.response?.data as
      | { message?: string; code?: string; errors?: unknown }
      | undefined;
    const formattedError: ApiError = {
      message: responseData?.message || error.message || 'An unexpected network error occurred.',
      statusCode: error.response?.status,
      code: responseData?.code || error.code,
      errors: responseData?.errors,
    };

    return Promise.reject(formattedError);
  },
);
