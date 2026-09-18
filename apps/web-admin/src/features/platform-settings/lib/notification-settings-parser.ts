import type {
  NotificationTemplatesMap,
  NotificationThresholds,
  PlatformSettingItem,
} from '../types';

import {
  DEFAULT_NOTIFICATION_TEMPLATES_ADMIN,
  DEFAULT_NOTIFICATION_THRESHOLDS,
} from './notification-settings-defaults';

export interface ParsedNotificationSettings {
  templates: NotificationTemplatesMap;
  thresholds: NotificationThresholds;
}

export function parseNotificationSettings(
  settings: PlatformSettingItem[],
): ParsedNotificationSettings {
  const map = new Map<string, string>();
  for (const item of settings) {
    map.set(item.key, item.value);
  }

  // Parse Templates
  let templates = { ...DEFAULT_NOTIFICATION_TEMPLATES_ADMIN };
  const rawTemplates = map.get('notification.templates');
  if (rawTemplates) {
    try {
      const parsed = JSON.parse(rawTemplates) as NotificationTemplatesMap;
      templates = { ...templates, ...parsed };
    } catch {
      // Keep defaults if corrupted
    }
  }

  // Parse Thresholds
  const thresholds: NotificationThresholds = {
    adminPollingIntervalSeconds: map.has('notification.admin_polling_interval_seconds')
      ? parseInt(map.get('notification.admin_polling_interval_seconds')!, 10) ||
        DEFAULT_NOTIFICATION_THRESHOLDS.adminPollingIntervalSeconds
      : DEFAULT_NOTIFICATION_THRESHOLDS.adminPollingIntervalSeconds,

    quietHoursStart:
      map.get('notification.quiet_hours_start') || DEFAULT_NOTIFICATION_THRESHOLDS.quietHoursStart,

    quietHoursEnd:
      map.get('notification.quiet_hours_end') || DEFAULT_NOTIFICATION_THRESHOLDS.quietHoursEnd,

    criticalCodThreshold: map.has('notification.critical_cod_threshold')
      ? parseFloat(map.get('notification.critical_cod_threshold')!) ||
        DEFAULT_NOTIFICATION_THRESHOLDS.criticalCodThreshold
      : DEFAULT_NOTIFICATION_THRESHOLDS.criticalCodThreshold,

    cartLowStockThreshold: map.has('notification.cart_low_stock_threshold')
      ? parseInt(map.get('notification.cart_low_stock_threshold')!, 10) ||
        DEFAULT_NOTIFICATION_THRESHOLDS.cartLowStockThreshold
      : DEFAULT_NOTIFICATION_THRESHOLDS.cartLowStockThreshold,

    abandonedCartDelayMinutes: map.has('notification.abandoned_cart_delay_minutes')
      ? parseInt(map.get('notification.abandoned_cart_delay_minutes')!, 10) ||
        DEFAULT_NOTIFICATION_THRESHOLDS.abandonedCartDelayMinutes
      : DEFAULT_NOTIFICATION_THRESHOLDS.abandonedCartDelayMinutes,

    abandonedCartEnabled: map.has('notification.abandoned_cart_enabled')
      ? map.get('notification.abandoned_cart_enabled') === 'true'
      : DEFAULT_NOTIFICATION_THRESHOLDS.abandonedCartEnabled,

    maxMarketingPushesPerDay: map.has('notification.max_marketing_pushes_per_day')
      ? parseInt(map.get('notification.max_marketing_pushes_per_day')!, 10) ||
        DEFAULT_NOTIFICATION_THRESHOLDS.maxMarketingPushesPerDay
      : DEFAULT_NOTIFICATION_THRESHOLDS.maxMarketingPushesPerDay,
  };

  return { templates, thresholds };
}

export function formatSettingsForBulkUpdate(
  templates: NotificationTemplatesMap,
  thresholds: NotificationThresholds,
): { key: string; value: string }[] {
  return [
    {
      key: 'notification.templates',
      value: JSON.stringify(templates),
    },
    {
      key: 'notification.admin_polling_interval_seconds',
      value: String(thresholds.adminPollingIntervalSeconds),
    },
    {
      key: 'notification.quiet_hours_start',
      value: thresholds.quietHoursStart,
    },
    {
      key: 'notification.quiet_hours_end',
      value: thresholds.quietHoursEnd,
    },
    {
      key: 'notification.critical_cod_threshold',
      value: String(thresholds.criticalCodThreshold),
    },
    {
      key: 'notification.cart_low_stock_threshold',
      value: String(thresholds.cartLowStockThreshold),
    },
    {
      key: 'notification.abandoned_cart_delay_minutes',
      value: String(thresholds.abandonedCartDelayMinutes),
    },
    {
      key: 'notification.abandoned_cart_enabled',
      value: String(thresholds.abandonedCartEnabled),
    },
    {
      key: 'notification.max_marketing_pushes_per_day',
      value: String(thresholds.maxMarketingPushesPerDay),
    },
  ];
}
