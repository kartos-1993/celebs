/**
 * Canonical Axios client barrel.
 * Import the client from '@/lib/axios' anywhere in web-admin.
 */
import { axiosClient } from './axios-client';

export { axiosClient };
export { setAuthCallbacks, broadcastLogout } from './interceptors';

// Backwards-compatibility aliases so callers don't need updating
export const apiClient = axiosClient;
export const AuthAPI = axiosClient;
export const ProductAPI = axiosClient;
export const OptionSetAPI = axiosClient;
export const APIRefresh = axiosClient;

export default axiosClient;
