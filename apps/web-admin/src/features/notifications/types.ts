import type {
  INotification,
  IUnreadCount,
  NotificationSeverity,
  NotificationType,
} from '@celebs/shared-types';

export type { INotification, IUnreadCount, NotificationSeverity, NotificationType };

export type NotificationFilterTab = 'all' | 'unread';

export interface NotificationItemUI {
  id: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown> | null;
}

export interface NotificationsListParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
}

export interface PaginatedNotificationsPayload {
  items: NotificationItemUI[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
