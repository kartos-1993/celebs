import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { axiosClient } from './axios-client';
import { CustomAxiosRequestConfig, ApiErrorResponse } from './types';

// ─── Mutex Lock State ────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// ─── Auth state callbacks ─────────────────────────────────────────────────────
let _onTokenRefreshed: (() => void) | null = null;
let _onSessionExpired: (() => void) | null = null;

export const setAuthCallbacks = (callbacks: {
  onTokenRefreshed?: () => void;
  onSessionExpired?: () => void;
}) => {
  _onTokenRefreshed = callbacks.onTokenRefreshed ?? null;
  _onSessionExpired = callbacks.onSessionExpired ?? null;
};

// ─── Cross-Tab BroadcastChannel Synchronization ──────────────────────────────
type AuthMessage =
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS' }
  | { type: 'REFRESH_FAILURE' }
  | { type: 'LOGOUT' };

const CHANNEL_NAME = 'celebs_admin_auth_channel';

const authChannel =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;

if (authChannel) {
  authChannel.onmessage = (event: MessageEvent<AuthMessage>) => {
    const { type } = event.data || {};
    switch (type) {
      case 'REFRESH_START':
        // Another tab started refreshing. Set local flag so this tab queues 401s
        isRefreshing = true;
        break;

      case 'REFRESH_SUCCESS':
        // Another tab finished refresh successfully. Drain our queue & sync state
        isRefreshing = false;
        _onTokenRefreshed?.();
        processQueue(null);
        break;

      case 'REFRESH_FAILURE':
        // Another tab failed to refresh. Reject queued requests & logout
        isRefreshing = false;
        processQueue(new Error('Session expired in another tab'));
        _onSessionExpired?.();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        break;

      case 'LOGOUT':
        isRefreshing = false;
        _onSessionExpired?.();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        break;
    }
  };
}

/** Broadcast a logout event to all open admin tabs */
export const broadcastLogout = () => {
  authChannel?.postMessage({ type: 'LOGOUT' });
};

// ─── URL bypass list ──────────────────────────────────────────────────────────
const AUTH_BYPASS_URLS = [
  '/auth/login',
  '/auth/register',
  '/auth/password-forgot',
  '/auth/password-reset',
  '/auth/verify-email',
  '/auth/refresh',
];

// ─── Register interceptors ───────────────────────────────────────────────────
export const setupInterceptors = () => {
  axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => config,
    (error) => Promise.reject(error),
  );

  axiosClient.interceptors.response.use(
    (response) => {
      if (response.data && typeof response.data === 'object' && response.data.success === false) {
        const errorData = response.data as Record<string, unknown>;
        const apiError: ApiErrorResponse = {
          status: response.status,
          message: typeof errorData.message === 'string' ? errorData.message : 'Operation failed',
          errorCode: typeof errorData.errorCode === 'string' ? errorData.errorCode : undefined,
          ...errorData,
        };
        return Promise.reject(apiError);
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

      if (!error.response) {
        return Promise.reject({ message: 'Network Error' } as ApiErrorResponse);
      }

      const { status, data } = error.response;
      const errorData = data as Record<string, unknown>;

      // ── 401 handling ─────────────────────────────────────────────────────
      if (
        status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.skipAuthRefresh
      ) {
        const isBypassUrl = AUTH_BYPASS_URLS.some((url) => originalRequest.url?.includes(url));

        if (isBypassUrl) {
          return Promise.reject({
            status,
            message:
              typeof errorData?.message === 'string' ? errorData.message : error.message,
            ...(typeof errorData === 'object' ? errorData : {}),
          } as ApiErrorResponse);
        }

        // ── Mutex Lock — queue concurrent requests ────────────────────────
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => axiosClient(originalRequest))
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        // Broadcast to other open tabs that THIS tab is initiating refresh
        authChannel?.postMessage({ type: 'REFRESH_START' });

        try {
          await axiosClient.post('/auth/refresh', null, { skipAuthRefresh: true } as CustomAxiosRequestConfig);

          // Broadcast to other open tabs that refresh succeeded
          authChannel?.postMessage({ type: 'REFRESH_SUCCESS' });

          _onTokenRefreshed?.();
          processQueue(null);

          return axiosClient(originalRequest);
        } catch (refreshError) {
          const err = refreshError instanceof Error ? refreshError : new Error('Refresh failed');

          // Broadcast to other open tabs that refresh failed
          authChannel?.postMessage({ type: 'REFRESH_FAILURE' });

          processQueue(err);
          _onSessionExpired?.();

          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }

          return Promise.reject({ message: 'Session expired. Please log in again.' } as ApiErrorResponse);
        } finally {
          isRefreshing = false;
        }
      }

      // ── Generic error normalisation ───────────────────────────────────────
      return Promise.reject({
        status,
        message:
          typeof errorData?.message === 'string' ? errorData.message : error.message,
        ...(typeof errorData === 'object' ? errorData : {}),
      } as ApiErrorResponse);
    },
  );
};

setupInterceptors();
