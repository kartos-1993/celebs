// filepath: d:\business\celebs-repo\apps\admin\web\src\lib\axios-client.ts
import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

// Fallback URLs for cases where env vars might not load
const FALLBACK_API_URL = 'http://localhost:8000/api/v1/';
const FALLBACK_AUTH_API_URL = 'http://localhost:8000/api/v1/auth';
const FALLBACK_PRODUCT_API_URL = 'http://localhost:8000/api/v1/product';

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || FALLBACK_AUTH_API_URL;
const PRODUCT_API_URL =
  import.meta.env.VITE_PRODUCT_API_URL || FALLBACK_PRODUCT_API_URL;

console.log('[Axios Config] Using Auth API URL:', AUTH_API_URL);
console.log('[Axios Config] Using Product API URL:', PRODUCT_API_URL);

const baseOptions = {
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

// General API client for backwards compatibility

// Service-specific API clients
export const AuthAPI = axios.create({ ...baseOptions, baseURL: AUTH_API_URL });
export const ProductAPI = axios.create({
  ...baseOptions,
  baseURL: PRODUCT_API_URL,
});

// Refresh client (using Auth API for refresh token)
export const APIRefresh = axios.create({
  ...baseOptions,
  baseURL: AUTH_API_URL,
});
APIRefresh.interceptors.response.use((response) => response);

// Add a request interceptor to include the JWT token in the Authorization header
const addAuthHeader = (config: InternalAxiosRequestConfig) => {
  // Get token from cookie
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
  };

  const token = getCookie('accessToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    console.log(
      'Adding auth header with token',
      token.substring(0, 10) + '...',
    );
  }
  return config;
};

ProductAPI.interceptors.request.use(addAuthHeader);

// Create a reusable error handler for all API instances
const createErrorInterceptor = (instance: AxiosInstance) => {
  return async (error: AxiosError) => {
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({ message: 'Network Error' });
    }

    const { status, data } = error.response;

    // Handle all 401 unauthorized errors
    if (status === 401) {
      try {
        // Only try to refresh if it's not already a refresh token request
        if (!error.config?.url?.includes('/auth/refresh')) {
          await APIRefresh.get('/auth/refresh');
          // If refresh successful, retry the original request
          if (error.config) {
            return instance(error.config as InternalAxiosRequestConfig);
          }
        }
        // If refresh request fails or this is a refresh request with 401
        console.error('Authentication failed, redirecting to login');
        window.location.href = '/login';
        return Promise.reject({ message: 'Session expired' });
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        window.location.href = '/login';
        return Promise.reject({ message: 'Session expired' });
      }
    }

    // Handle other errors with type safety
    const errorData = data as Record<string, unknown>;
    return Promise.reject({
      status: error.response?.status,
      message:
        typeof errorData?.message === 'string'
          ? errorData.message
          : error.message,
      ...(typeof errorData === 'object' ? errorData : {}),
    });
  };
};

AuthAPI.interceptors.response.use(
  (response) => response,
  createErrorInterceptor(AuthAPI),
);

ProductAPI.interceptors.response.use(
  (response) => response,
  createErrorInterceptor(ProductAPI),
);

export default { AuthAPI, ProductAPI, APIRefresh };
