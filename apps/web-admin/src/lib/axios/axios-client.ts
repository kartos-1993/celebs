import axios from 'axios';

const FALLBACK_API_URL = 'http://localhost:3333/api/v1/';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_AUTH_URL ||
  import.meta.env.VITE_API_PRODUCT_URL ||
  FALLBACK_API_URL;

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});
