import { AxiosRequestConfig } from 'axios';

export interface ApiErrorResponse {
  status?: number;
  message: string;
  errorCode?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}
