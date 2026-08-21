import { axiosClient } from '@/lib/axios/axios-client';
import type { SessionResponse } from '@/types';

export const ACCOUNT_QUERY_KEYS = {
  all: ['account'] as const,
  userSession: () => [...ACCOUNT_QUERY_KEYS.all, 'user-session'] as const,
  sessions: () => [...ACCOUNT_QUERY_KEYS.all, 'sessions'] as const,
};

export interface SessionType {
  id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface SessionResponseType {
  message: string;
  sessions: SessionType[];
}

export async function getUserSession(): Promise<SessionResponse> {
  const response = await axiosClient.get<SessionResponse>(`/session/?t=${Date.now()}`);
  return response.data;
}

export async function getAllSessions(): Promise<SessionResponseType> {
  const response = await axiosClient.get<SessionResponseType>('/session/all');
  return response.data;
}

export async function deleteSession(id: string) {
  return await axiosClient.delete(`/session/${id}`);
}
