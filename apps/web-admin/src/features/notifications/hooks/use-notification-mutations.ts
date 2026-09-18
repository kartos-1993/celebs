import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATIONS_QUERY_KEYS,
} from '../api';

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount() });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.lists() });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount() });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEYS.lists() });
    },
  });
}
