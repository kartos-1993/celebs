export type NotificationType =
  | 'ORDER_STATUS'
  | 'PAYMENT'
  | 'BROADCAST'
  | 'SYSTEM'
  | 'VENDOR_ORDER'
  | 'REVIEW'
  | 'PRICE_DROP'
  | 'CART_ABANDONED';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'INBOX_ONLY';

export type PushPlatform = 'android' | 'ios' | 'web';

export type PushStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface INotification {
  id: string;
  userId: string;
  vendorId?: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  read: boolean;
  pushStatus: PushStatus;
  channel: NotificationChannel;
  createdAt: string | Date;
}

export interface IUnreadCount {
  count: number;
  hasCritical: boolean;
}

export interface IPushToken {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export * from '../validators/notification.validator';
