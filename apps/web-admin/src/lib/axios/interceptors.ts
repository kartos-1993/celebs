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
// These are set by the AuthProvider to allow the interceptor to update React
// state without creating a circular dependency.
let _onTokenRefreshed: (() => void) | null = null;
let _onSessionExpired: (() => void) | null = null;

export const setAuthCallbacks = (callbacks: {
  onTokenRefreshed?: () => void;
  onSessionExpired?: () => void;
}) => {
  _onTokenRefreshed = callbacks.onTokenRefreshed ?? null;
  _onSessionExpired = callbacks.onSessionExpired ?? null;
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
  // Request interceptor — reserved for future header injection (tenant, trace-id, etc.)
  axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => config,
    (error) => Promise.reject(error),
  );

  // Response interceptor — handles 401 with Mutex Lock queue
  axiosClient.interceptors.response.use(
    (response) => {
      // Treat HTTP 200 responses whose body signals failure as errors
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
        // Do NOT attempt refresh for auth-specific endpoints
        const isBypassUrl = AUTH_BYPASS_URLS.some((url) =>
          originalRequest.url?.includes(url),
        );

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

        try {
          await axiosClient.post('/auth/refresh', null, { skipAuthRefresh: true } as CustomAxiosRequestConfig);

          // Notify React that the access token was refreshed (updates auth state)
          _onTokenRefreshed?.();

          // Drain queued requests
          processQueue(null);

          return axiosClient(originalRequest);
        } catch (refreshError) {
          const err = refreshError instanceof Error ? refreshError : new Error('Refresh failed');
          processQueue(err);

          // Notify React that the session is dead (clears auth state)
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

// Register interceptors immediately on module load
setupInterceptors();
