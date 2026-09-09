import type { UserProfile } from '../types';

import { apiClient } from '@/api/client';

export interface AuthSessionResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export async function loginWithGoogleApi(data: { idToken: string }): Promise<AuthSessionResponse> {
  const response = await apiClient.post<{ data: AuthSessionResponse }>('/auth/google', data, {
    skipAuth: true,
  });
  return response.data.data;
}

export async function loginWithEmailApi(
  email: string,
  password: string,
): Promise<AuthSessionResponse> {
  const response = await apiClient.post<{ data: AuthSessionResponse }>(
    '/auth/login',
    { email, password },
    { skipAuth: true },
  );
  return response.data.data;
}

export async function registerApi(payload: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): Promise<unknown> {
  const response = await apiClient.post(
    '/auth/register',
    {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      confirmPassword: payload.confirmPassword ?? payload.password,
    },
    { skipAuth: true },
  );
  return response.data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout').catch(() => {});
}
