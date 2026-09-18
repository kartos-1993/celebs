import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getNotifications, getUnreadCount, NOTIFICATIONS_QUERY_KEYS } from '../api';
import { playCriticalChime } from '../lib/sound.util';
import type { NotificationsListParams, PaginatedNotificationsPayload } from '../types';

/**
 * Hook for polling unread notification count.
 * Uses a startup-realistic 90s interval, pauses when backgrounded,
 * and refetches on window focus. Triggers critical chime on critical notification arrival.
 */
export function useUnreadNotificationCount() {
  const previousCriticalRef = useRef<boolean>(false);

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.unreadCount(),
    queryFn: getUnreadCount,
    select: (res) => res.data,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5_000,
  });

  const hasCritical = query.data?.hasCritical ?? false;
  const count = query.data?.count ?? 0;

  useEffect(() => {
    if (hasCritical && !previousCriticalRef.current && count > 0) {
      playCriticalChime();
    }
    previousCriticalRef.current = hasCritical;
  }, [hasCritical, count]);

  return {
    ...query,
    count,
    hasCritical,
  };
}

/**
 * Hook to fetch notifications inbox for display inside the notification popover.
 */
export function useNotificationInbox(params: NotificationsListParams = {}, enabled = true) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEYS.list(params),
    queryFn: () => getNotifications(params),
    select: (res) => {
      const payload = res.data;
      if (Array.isArray(payload)) {
        return {
          items: payload,
          total: (res as unknown as { meta?: { total?: number } }).meta?.total ?? payload.length,
          page: (res as unknown as { meta?: { page?: number } }).meta?.page ?? 1,
          limit: (res as unknown as { meta?: { limit?: number } }).meta?.limit ?? 20,
          totalPages: (res as unknown as { meta?: { totalPages?: number } }).meta?.totalPages ?? 1,
        };
      }
      return payload as PaginatedNotificationsPayload;
    },
    enabled,
    staleTime: 5_000,
  });
}
