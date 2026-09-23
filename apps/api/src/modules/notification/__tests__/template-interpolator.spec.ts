import { describe, expect, it } from 'vitest';

import type { PlatformSettingsRepository } from '../../platform-settings/platform-settings.repository';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  interpolateTemplate,
  resolveNotificationTemplate,
} from '../template-interpolator.util';
import { validateNotificationTemplate } from '../template-validator.util';

describe('Template Interpolator & Validator (TDD Phase 2)', () => {
  describe('interpolateTemplate', () => {
    it('should replace {{variable}} placeholders with provided values', () => {
      const template = 'Your order #{{orderNumber}} is on the way! Tracking: {{trackingNumber}}';
      const variables = { orderNumber: '10042', trackingNumber: 'TRK-98765' };

      const result = interpolateTemplate(template, variables);

      expect(result).toBe('Your order #10042 is on the way! Tracking: TRK-98765');
    });

    it('should leave unknown or missing variables gracefully blank', () => {
      const template = 'Order #{{orderNumber}} shipped to {{customerName}}.';
      const variables = { orderNumber: '10042' };

      const result = interpolateTemplate(template, variables);

      expect(result).toBe('Order #10042 shipped to .');
    });

    it('should handle templates with no variables without alteration', () => {
      const template = 'Order Cancelled';
      const result = interpolateTemplate(template, {});

      expect(result).toBe('Order Cancelled');
    });
  });

  describe('validateNotificationTemplate', () => {
    it('should validate a correct template matching schema and required variables', () => {
      const template = {
        title: 'Order Shipped ✈️',
        body: 'Your package #{{orderNumber}} has shipped.',
        severity: 'INFO' as const,
        requiredVariables: ['orderNumber'],
        allowedVariables: ['orderNumber', 'trackingNumber'],
      };

      const result = validateNotificationTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a template that is missing a required variable in the body or title', () => {
      const template = {
        title: 'Order Shipped',
        body: 'Your package has shipped without number.', // Missing {{orderNumber}}
        severity: 'INFO' as const,
        requiredVariables: ['orderNumber'],
        allowedVariables: ['orderNumber'],
      };

      const result = validateNotificationTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Missing required variable: {{orderNumber}} in title or body',
      );
    });

    it('should reject a template exceeding title length (100 chars) or body length (250 chars)', () => {
      const template = {
        title: 'A'.repeat(101),
        body: 'B'.repeat(251) + ' {{orderNumber}}',
        severity: 'INFO' as const,
        requiredVariables: ['orderNumber'],
        allowedVariables: ['orderNumber'],
      };

      const result = validateNotificationTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title exceeds maximum allowed length of 100 characters');
      expect(result.errors).toContain('Body exceeds maximum allowed length of 250 characters');
    });
  });

  describe('resolveNotificationTemplate', () => {
    it('should fallback to default template when setting is null or invalid', async () => {
      const mockSettingsRepo = {
        getSettingByKey: async () => null,
      };

      const resolved = await resolveNotificationTemplate(
        'ORDER_CONFIRMED',
        { orderNumber: '10042' },
        mockSettingsRepo as unknown as PlatformSettingsRepository,
      );

      expect(resolved.title).toBe(DEFAULT_NOTIFICATION_TEMPLATES.ORDER_CONFIRMED.title);
      expect(resolved.body).toContain('#10042');
      expect(resolved.severity).toBe('INFO');
    });

    it('should use custom template from PlatformSettings when configured and valid', async () => {
      const customTemplates = {
        ORDER_CONFIRMED: {
          title: 'Custom Order Confirmed! 🎉',
          body: 'Celebs has received order #{{orderNumber}} and we are packing it!',
          severity: 'INFO',
          requiredVariables: ['orderNumber'],
        },
      };

      const mockSettingsRepo = {
        getSettingByKey: async (key: string) => {
          if (key === 'notification.templates') {
            return { value: JSON.stringify(customTemplates) };
          }
          return null;
        },
      };

      const resolved = await resolveNotificationTemplate(
        'ORDER_CONFIRMED',
        { orderNumber: '99999' },
        mockSettingsRepo as unknown as PlatformSettingsRepository,
      );

      expect(resolved.title).toBe('Custom Order Confirmed! 🎉');
      expect(resolved.body).toBe('Celebs has received order #99999 and we are packing it!');
    });

    it('should resolve default template for ORDER_PACKED and ORDER_HANDED_OVER', async () => {
      const mockSettingsRepo = {
        getSettingByKey: async () => null,
      };

      const packed = await resolveNotificationTemplate(
        'ORDER_PACKED',
        { orderNumber: '10043' },
        mockSettingsRepo as unknown as PlatformSettingsRepository,
      );
      expect(packed.title).toContain('Packed');
      expect(packed.body).toContain('#10043');

      const handedOver = await resolveNotificationTemplate(
        'ORDER_HANDED_OVER',
        { orderNumber: '10044', trackingNumber: 'TRK-123' },
        mockSettingsRepo as unknown as PlatformSettingsRepository,
      );
      expect(handedOver.title).toContain('Handed Over');
      expect(handedOver.body).toContain('#10044');
      expect(handedOver.body).toContain('TRK-123');
    });
  });
});
