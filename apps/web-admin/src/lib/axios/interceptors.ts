import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { axiosClient } from './axios-client';
import { CustomAxiosRequestConfig, ApiErrorResponse } from './types';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export const setupInterceptors = () => {
  axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Future tenant/token header injection if needed
      return config;
    },
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
      const originalRequest = error.config as CustomAxiosRequestConfig;

      if (!error.response) {
        return Promise.reject({ message: 'Network Error' } as ApiErrorResponse);
      }

      const { status, data } = error.response;

      if (
        status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.skipAuthRefresh
      ) {
        const bypassUrls = [
          '/auth/login',
          '/auth/register',
          '/auth/password-forgot',
          '/auth/password-reset',
          '/auth/verify-email',
          '/auth/refresh',
        ];

        const isBypassUrl = bypassUrls.some((url) => originalRequest.url?.includes(url));

        if (isBypassUrl) {
          const errorData = data as Record<string, unknown>;
          return Promise.reject({
            status,
            message: typeof errorData?.message === 'string' ? errorData.message : error.message,
            ...(typeof errorData === 'object' ? errorData : {}),
          } as ApiErrorResponse);
        }

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
          await axiosClient.post('/auth/refresh');
          processQueue(null);
          return axiosClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject({ message: 'Session expired' } as ApiErrorResponse);
        } finally {
          isRefreshing = false;
        }
      }

      const errorData = data as Record<string, unknown>;
      return Promise.reject({
        status,
        message: typeof errorData?.message === 'string' ? errorData.message : error.message,
        ...(typeof errorData === 'object' ? errorData : {}),
      } as ApiErrorResponse);
    },
  );
};

// Initialize interceptors immediately
setupInterceptors();
