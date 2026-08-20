import axios from 'axios';
import { setupInterceptors } from './interceptors';

// Standardized API Base URL and Versioning configuration
const apiHost = (import.meta.env.VITE_API_HOST || 'http://localhost:3333').replace(/\/+$/, '');
const apiVersion = import.meta.env.VITE_API_VERSION || 'v1';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || `${apiHost}/api/${apiVersion}`
).replace(/\/+$/, '');

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Attach interceptors immediately to the created instance
setupInterceptors(axiosClient);
