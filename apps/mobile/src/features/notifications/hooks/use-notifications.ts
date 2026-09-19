import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getNotificationsApi,
  getUnreadCountApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
  NOTIFICATION_QUERY_KEYS,
} from '../api';
import type { NotificationItemMobile, UnreadCountData } from '../types';

export function useNotificationsQuery(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  return useQuery<NotificationItemMobile[]>({
    queryKey: NOTIFICATION_QUERY_KEYS.list(params),
    queryFn: () => getNotificationsApi(params),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadCountQuery() {
  return useQuery<UnreadCountData>({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount(),
    queryFn: () => getUnreadCountApi(),
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationAsReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    },
  });
}

export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsAsReadApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    },
  });
}
