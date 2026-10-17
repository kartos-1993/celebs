import { logger } from '@celebs/shared-utils';

import {
  PlatformSettingsRepository,
  platformSettingsRepository,
} from '../platform-settings/platform-settings.repository';

import {
  type NotificationTemplateDefinition,
  validateNotificationTemplate,
} from './template-validator.util';

export const DEFAULT_NOTIFICATION_TEMPLATES: Record<string, NotificationTemplateDefinition> = {
  ORDER_PENDING: {
    title: 'Order Placed Successfully! 🛍️',
    body: 'Your order #{{orderNumber}} has been placed and is being prepared.',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'totalAmount', 'customerName'],
  },
  ORDER_PENDING_PAYMENT: {
    title: 'Order Placed — Payment Pending ⏳',
    body: 'Please complete payment for order #{{orderNumber}} to begin processing.',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'totalAmount'],
  },
  ORDER_PAID: {
    title: 'Payment Confirmed! ✅',
    body: 'Payment for order #{{orderNumber}} was successfully received.',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'totalAmount', 'gateway'],
  },
  ORDER_CONFIRMED: {
    title: 'Order Confirmed 🛍️',
    body: 'Your order #{{orderNumber}} has been confirmed and is being processed.',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'customerName'],
  },
  ORDER_PACKED: {
    title: 'Order Packed 📦',
    body: 'Your order #{{orderNumber}} has been packed and is awaiting courier handover.',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber'],
  },
  ORDER_HANDED_OVER: {
    title: 'Order Handed Over for Delivery 🚚',
    body: 'Your order #{{orderNumber}} is on its way! Tracking: {{trackingNumber}}',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'trackingNumber'],
  },
  ORDER_SHIPPED: {
    title: 'Order Shipped ✈️',
    body: 'Your order #{{orderNumber}} is on the way! Tracking: {{trackingNumber}}',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'trackingNumber'],
  },
  OUT_FOR_DELIVERY: {
    title: 'Out for Delivery 🚚',
    body: 'Your package for #{{orderNumber}} is out for delivery today!',
    severity: 'CRITICAL',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber'],
  },
  ORDER_OUT_FOR_DELIVERY: {
    title: 'Out for Delivery 🚚',
    body: 'Your package for #{{orderNumber}} is out for delivery today!',
    severity: 'CRITICAL',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber'],
  },
  ORDER_DELIVERED: {
    title: 'Package Delivered! 🎉',
    body: 'Your order #{{orderNumber}} has arrived. Tap here to leave a review!',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber'],
  },
  ORDER_CANCELLED: {
    title: 'Order Cancelled',
    body: 'Your order #{{orderNumber}} was cancelled.',
    severity: 'CRITICAL',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber'],
  },
  ORDER_RETURNED: {
    title: 'Order Returned ↩️',
    body: 'Return processed for order #{{orderNumber}}.',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber'],
  },
  VENDOR_NEW_ORDER: {
    title: 'New Order Received! 📦',
    body: 'You have a new order #{{orderNumber}} for your store.',
    severity: 'CRITICAL',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'itemCount'],
  },
};

/**
 * Replaces {{variable}} placeholders with the provided values.
 * Unknown or undefined placeholders are replaced with an empty string.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : '';
  });
}

export interface ResolvedNotificationContent {
  title: string;
  body: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

/**
 * Resolves a notification template dynamically from PlatformSettings (L1/L2 cached, <0.05µs latency)
 * and falls back safely to hardcoded default templates.
 */
export async function resolveNotificationTemplate(
  eventType: string,
  variables: Record<string, string | number | undefined>,
  settingsRepo: PlatformSettingsRepository = platformSettingsRepository,
): Promise<ResolvedNotificationContent> {
  const fallback = DEFAULT_NOTIFICATION_TEMPLATES[eventType] || {
    title: 'Notification Update',
    body: 'You have an update on your order.',
    severity: 'INFO' as const,
  };

  let chosenDefinition = fallback;

  try {
    const setting = await settingsRepo.getSettingByKey('notification.templates');
    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      const custom = parsed?.[eventType] as NotificationTemplateDefinition | undefined;
      if (custom) {
        const validation = validateNotificationTemplate(custom);
        if (validation.isValid) {
          chosenDefinition = custom;
        } else {
          logger.warn(
            { eventType, errors: validation.errors },
            '[TemplateInterpolator] Custom template failed validation, using fallback default',
          );
        }
      }
    }
  } catch (err) {
    logger.error(
      { err, eventType },
      '[TemplateInterpolator] Error reading notification.templates from settings, using fallback default',
    );
  }

  return {
    title: interpolateTemplate(chosenDefinition.title, variables),
    body: interpolateTemplate(chosenDefinition.body, variables),
    severity: chosenDefinition.severity,
  };
}
