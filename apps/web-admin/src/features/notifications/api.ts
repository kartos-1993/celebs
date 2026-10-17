import type { IApiResponse } from '@celebs/shared-types';

import type {
  IUnreadCount,
  NotificationItemUI,
  NotificationsListParams,
  PaginatedNotificationsPayload,
} from './types';

import { axiosClient } from '@/lib/axios/axios-client';

export const NOTIFICATIONS_QUERY_KEYS = {
  all: ['notifications'] as const,
  unreadCount: () => [...NOTIFICATIONS_QUERY_KEYS.all, 'unread-count'] as const,
  lists: () => [...NOTIFICATIONS_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: NotificationsListParams) =>
    [...NOTIFICATIONS_QUERY_KEYS.lists(), filters ?? {}] as const,
};

export type UnreadCountResponse = IApiResponse<IUnreadCount>;
export type NotificationsListResponse = IApiResponse<PaginatedNotificationsPayload>;
export type MarkAsReadResponse = IApiResponse<NotificationItemUI>;
export type MarkAllAsReadResponse = IApiResponse<{ count: number }>;

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await axiosClient.get<UnreadCountResponse>('/notifications/unread-count');
  return response.data;
}

export async function getNotifications(
  params: NotificationsListParams = {},
): Promise<NotificationsListResponse> {
  const response = await axiosClient.get<NotificationsListResponse>('/notifications', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      ...(params.type ? { type: params.type } : {}),
      ...(params.unreadOnly ? { unreadOnly: true } : {}),
    },
  });
  return response.data;
}

export async function markNotificationAsRead(id: string): Promise<MarkAsReadResponse> {
  const response = await axiosClient.patch<MarkAsReadResponse>(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead(): Promise<MarkAllAsReadResponse> {
  const response = await axiosClient.patch<MarkAllAsReadResponse>('/notifications/read-all');
  return response.data;
}
