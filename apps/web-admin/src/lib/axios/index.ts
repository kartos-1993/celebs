/**
 * Canonical Axios client barrel.
 * Import the client from '@/lib/axios' anywhere in web-admin.
 * Interceptors are side-effected on import so they are registered once.
 */
import { axiosClient } from './axios-client';
import './interceptors';

export { axiosClient };
export { setAuthCallbacks } from './interceptors';

// Backwards-compatibility aliases so callers don't need updating
export const apiClient = axiosClient;
export const AuthAPI = axiosClient;
export const ProductAPI = axiosClient;
export const OptionSetAPI = axiosClient;
export const APIRefresh = axiosClient;

export default axiosClient;
