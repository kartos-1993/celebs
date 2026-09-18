import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getNotificationsApi,
  getUnreadCountApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
  NOTIFICATION_QUERY_KEYS,
} from '../api';
import type { NotificationsResponseData, UnreadCountData } from '../types';

export function useNotificationsQuery(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) {
  return useQuery<NotificationsResponseData>({
    queryKey: NOTIFICATION_QUERY_KEYS.list(params),
    queryFn: () => getNotificationsApi(params),
    staleTime: 30_000,
  });
}

export function useUnreadCountQuery() {
  return useQuery<UnreadCountData>({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount(),
    queryFn: () => getUnreadCountApi(),
    staleTime: 30_000,
    refetchInterval: 90_000,
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
