import type { NotificationSeverity } from '@celebs/shared-types';

export interface PlatformSettingItem {
  key: string;
  value: string;
  type: 'BOOLEAN' | 'NUMBER' | 'STRING' | 'JSON';
  group: string;
  label: string;
  description?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface NotificationTemplateItem {
  title: string;
  body: string;
  severity: NotificationSeverity;
  requiredVariables?: string[];
  allowedVariables?: string[];
}

export type NotificationTemplatesMap = Record<string, NotificationTemplateItem>;

export interface NotificationThresholds {
  adminPollingIntervalSeconds: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  criticalCodThreshold: number;
  cartLowStockThreshold: number;
  abandonedCartDelayMinutes: number;
  abandonedCartEnabled: boolean;
  maxMarketingPushesPerDay: number;
}
