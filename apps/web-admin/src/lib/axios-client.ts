import { axiosClient } from './axios/axiosClient';
import './axios/interceptors';

export { axiosClient };

// Backwards-compatibility aliases
export const apiClient = axiosClient;
export const AuthAPI = axiosClient;
export const ProductAPI = axiosClient;
export const APIRefresh = axiosClient;

export default axiosClient;

