import type {
  NotificationChannel,
  NotificationSeverity,
  NotificationType,
} from '@celebs/shared-types';

export interface NotificationItemMobile {
  id: string;
  userId?: string | null;
  vendorId?: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: string | null;
  data?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationsResponseData {
  notifications: NotificationItemMobile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountData {
  unreadCount: number;
}
