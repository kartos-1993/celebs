import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../constants/config';
import { ApiError } from './types';

const TOKEN_KEY = 'auth_access_token';

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
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

// Request Interceptor: Attach Auth Token if available and not skipped
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig & { skipAuth?: boolean }) => {
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
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling & 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const isPublicEndpoint = (error.config as any)?.skipAuth;

    if (error.response?.status === 401 && !isPublicEndpoint) {
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch (e) {
        console.warn('Failed to clear expired auth token:', e);
      }
    }

    const responseData = error.response?.data as any;
    const formattedError: ApiError = {
      message:
        responseData?.message ||
        error.message ||
        'An unexpected network error occurred.',
      statusCode: error.response?.status,
      code: responseData?.code || error.code,
      errors: responseData?.errors,
    };

    return Promise.reject(formattedError);
  }
);
