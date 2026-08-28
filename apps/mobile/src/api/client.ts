import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { API_CONFIG, getDevBaseUrl } from '../constants/config';

import { ApiError } from './types';

const TOKEN_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user_profile';

/**
 * Registered by AuthProvider so a hard 401 (refresh failed too) immediately
 * resets React state — otherwise the UI keeps showing "logged in" while
 * every request fails.
 */
type UnauthorizedCallback = () => void;
let unauthorizedHandler: UnauthorizedCallback | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedCallback | null): void {
  unauthorizedHandler = handler;
}

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

/* ------------------------------------------------------------------ *
 * Silent session refresh (single-flight)
 * ------------------------------------------------------------------ *
 * Access tokens are short-lived (1h dev / 15m prod). On the first 401 we
 * trade the long-lived refresh token for a new pair via POST /auth/refresh
 * (`x-refresh-token` header), persist them, and retry the original request
 * exactly once. Concurrent 401s await the same in-flight refresh.
 */

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export const setAuthToken = setAccessToken;
export const getAuthToken = getAccessToken;

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    // Bare axios instance — deliberately bypasses this file's interceptors.
    const response = await axios.post(`${getApiBaseUrl()}/auth/refresh`, undefined, {
      headers: { 'x-refresh-token': refreshToken },
      timeout: API_CONFIG.timeout,
    });

    const data = response.data?.data as { accessToken?: string; refreshToken?: string } | undefined;
    if (!data?.accessToken || !data?.refreshToken) return null;

    accessToken = data.accessToken;
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function refreshSingleFlight(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Request Interceptor: Synchronously attach central in-memory Auth Token (0ms bridge latency)
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig & { skipAuth?: boolean }) => {
    config.baseURL = getApiBaseUrl();

    if (!config.skipAuth) {
      // 1. Fast in-memory access token read
      let token = accessToken;

      // 2. Cold-boot fallback: if memory token not yet hydrated, read from SecureStore once
      if (!token) {
        try {
          token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (token) {
            accessToken = token;
          }
        } catch (error) {
          console.warn('Failed to retrieve auth token from SecureStore:', error);
        }
      }

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (__DEV__ && !isGuestCapable(config.url)) {
        console.warn(
          `[apiClient] ${config.method?.toUpperCase()} ${config.url} has no stored token — request will be anonymous`,
        );
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

type RetriableConfig = InternalAxiosRequestConfig & {
  skipAuth?: boolean;
  _retry?: boolean;
};

/**
 * Endpoints that legitimately serve guests via `optionalAuthenticateJWT` —
 * a missing token on these is normal, not a misconfiguration.
 */
const GUEST_CAPABLE_PREFIXES = [
  '/cart',
  '/category',
  '/products',
  '/banners',
  '/combos',
  '/settings',
];

function isGuestCapable(url?: string): boolean {
  return !!url && GUEST_CAPABLE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

// Response Interceptor: success:false guard, silent refresh + single retry,
// and hard-401 session teardown.
apiClient.interceptors.response.use(
  (response) => {
    // Defensive: reject 2xx envelopes that carry success:false so callers
    // never treat a failed operation as resolved data.
    const body = response.data as
      | { success?: boolean; message?: string; errors?: unknown }
      | undefined;
    if (body && typeof body === 'object' && body.success === false) {
      const formattedError: ApiError = {
        message: body.message || 'Request failed',
        statusCode: response.status,
        code: 'API_ERROR',
        errors: body.errors,
      };
      return Promise.reject(formattedError);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isPublicEndpoint = config?.skipAuth ?? false;
    const isAuthRoute = typeof config?.url === 'string' && config.url.startsWith('/auth/');
    const status = error.response?.status;

    if (status === 401 && !isPublicEndpoint && !isAuthRoute && !config?._retry) {
      const newAccessToken = await refreshSingleFlight();

      if (newAccessToken && config) {
        config._retry = true;
        if (config.headers) {
          config.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(config);
      }

      // Refresh unavailable/failed → tear the whole session down.
      accessToken = null;
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch (e) {
        console.warn('Failed to clear expired auth session:', e);
      }
      unauthorizedHandler?.();
    }

    const responseData = error.response?.data as
      | { message?: string; code?: string; errors?: unknown }
      | undefined;
    const formattedError: ApiError = {
      message: responseData?.message || error.message || 'An unexpected network error occurred.',
      statusCode: status,
      code: responseData?.code || error.code,
      errors: responseData?.errors,
    };

    return Promise.reject(formattedError);
  },
);

/** Persisted by AuthProvider alongside the access token after login/refresh. */
export async function storeRefreshToken(refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export const setRefreshToken = storeRefreshToken;
