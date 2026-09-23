import type {
  NotificationTemplateItem,
  NotificationTemplatesMap,
  NotificationThresholds,
} from '../types';

export const DEFAULT_NOTIFICATION_TEMPLATES_ADMIN: NotificationTemplatesMap = {
  ORDER_CONFIRMED: {
    title: 'Order Confirmed 🛍️',
    body: 'Your order #{{orderNumber}} has been confirmed and is being processed.',
    severity: 'INFO',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'customerName'],
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
  VENDOR_NEW_ORDER: {
    title: 'New Order Received! 📦',
    body: 'You have a new order #{{orderNumber}} for your store.',
    severity: 'CRITICAL',
    requiredVariables: ['orderNumber'],
    allowedVariables: ['orderNumber', 'itemCount'],
  },
};

export const DEFAULT_NOTIFICATION_THRESHOLDS: NotificationThresholds = {
  adminPollingIntervalSeconds: 90,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  criticalCodThreshold: 15000,
  cartLowStockThreshold: 3,
  abandonedCartDelayMinutes: 60,
  abandonedCartEnabled: true,
  maxMarketingPushesPerDay: 2,
};

export interface TemplateValidationResult {
  isValid: boolean;
  missingVariables: string[];
}

export function validateTemplateVariables(
  template: NotificationTemplateItem,
): TemplateValidationResult {
  const missingVariables: string[] = [];
  const text = `${template.title} ${template.body}`;

  if (template.requiredVariables) {
    for (const reqVar of template.requiredVariables) {
      if (!text.includes(`{{${reqVar}}}`)) {
        missingVariables.push(reqVar);
      }
    }
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
}
