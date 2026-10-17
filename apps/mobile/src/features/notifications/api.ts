import type { IApiResponse } from '@celebs/shared-types';

import type { NotificationItemMobile, UnreadCountData } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'] as const,
  unreadCount: () => [...NOTIFICATION_QUERY_KEYS.all, 'unread-count'] as const,
  lists: () => [...NOTIFICATION_QUERY_KEYS.all, 'list'] as const,
  list: (params?: Record<string, unknown>) =>
    [...NOTIFICATION_QUERY_KEYS.lists(), params ?? {}] as const,
  pushTokens: () => [...NOTIFICATION_QUERY_KEYS.all, 'push-tokens'] as const,
};

export async function registerPushTokenApi(
  pushToken: string,
  platform: 'android' | 'ios' | 'web' = 'android',
): Promise<void> {
  await handleApiResponse(
    apiClient.post<IApiResponse<null>>('/notifications/push-tokens', {
      pushToken,
      platform,
    }),
  );
}

export async function unregisterPushTokenApi(pushToken: string): Promise<void> {
  await handleApiResponse(
    apiClient.delete<IApiResponse<null>>('/notifications/push-tokens', {
      data: { pushToken },
    }),
  );
}

export async function getNotificationsApi(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationItemMobile[]> {
  const result = await handleApiResponse<
    NotificationItemMobile[] | { notifications: NotificationItemMobile[] }
  >(apiClient.get('/notifications', { params }));

  if (Array.isArray(result)) {
    return result;
  }
  return result?.notifications ?? [];
}

export async function getUnreadCountApi(): Promise<UnreadCountData> {
  const result = await handleApiResponse<{
    count?: number;
    unreadCount?: number;
    hasCritical?: boolean;
  }>(apiClient.get('/notifications/unread-count'));

  const count = result.count ?? result.unreadCount ?? 0;
  return {
    count,
    unreadCount: count,
    hasCritical: Boolean(result.hasCritical),
  };
}

export async function markNotificationAsReadApi(id: string): Promise<NotificationItemMobile> {
  return handleApiResponse(
    apiClient.patch<IApiResponse<NotificationItemMobile>>(`/notifications/${id}/read`),
  );
}

export async function markAllNotificationsAsReadApi(): Promise<{ count: number }> {
  return handleApiResponse(
    apiClient.patch<IApiResponse<{ count: number }>>('/notifications/read-all'),
  );
}
