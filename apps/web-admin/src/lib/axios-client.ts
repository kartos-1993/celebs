import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const FALLBACK_API_URL = 'http://localhost:3333/api/v1/';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_AUTH_URL ||
  import.meta.env.VITE_API_PRODUCT_URL ||
  FALLBACK_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Backwards-compatibility aliases
export const AuthAPI = apiClient;
export const ProductAPI = apiClient;
export const APIRefresh = apiClient;

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!error.response) {
      return Promise.reject({ message: 'Network Error' });
    }

    const { status, data } = error.response;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const bypassUrls = [
        '/auth/login',
        '/auth/register',
        '/auth/password-forgot',
        '/auth/password-reset',
        '/auth/verify-email',
        '/auth/refresh',
      ];

      const isBypassUrl = bypassUrls.some((url) =>
        originalRequest.url?.includes(url)
      );

      if (isBypassUrl) {
        const errorData = data as Record<string, unknown>;
        return Promise.reject({
          status,
          message:
            typeof errorData?.message === 'string'
              ? errorData.message
              : error.message,
          ...(typeof errorData === 'object' ? errorData : {}),
        });
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        console.error('Session refresh failed. Redirecting to login.');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject({ message: 'Session expired' });
      } finally {
        isRefreshing = false;
      }
    }

    const errorData = data as Record<string, unknown>;
    return Promise.reject({
      status,
      message:
        typeof errorData?.message === 'string'
          ? errorData.message
          : error.message,
      ...(typeof errorData === 'object' ? errorData : {}),
    });
  }
);

export default apiClient;
