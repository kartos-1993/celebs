import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

import { SettingsThresholdsForm } from '../components/settings-thresholds-form';
import { TemplateEditorCard } from '../components/template-editor-card';
import {
  DEFAULT_NOTIFICATION_TEMPLATES_ADMIN,
  DEFAULT_NOTIFICATION_THRESHOLDS,
  validateTemplateVariables,
} from '../lib/notification-settings-defaults';
import {
  formatSettingsForBulkUpdate,
  parseNotificationSettings,
} from '../lib/notification-settings-parser';
import type { NotificationTemplateItem, PlatformSettingItem } from '../types';

describe('Notification Settings & Template Editor (TDD Phase 4)', () => {
  describe('validateTemplateVariables', () => {
    it('should validate template containing all required variables', () => {
      const template: NotificationTemplateItem = {
        title: 'Order Shipped ✈️',
        body: 'Your order #{{orderNumber}} has shipped! Tracking: {{trackingNumber}}',
        severity: 'INFO',
        requiredVariables: ['orderNumber'],
        allowedVariables: ['orderNumber', 'trackingNumber'],
      };

      const result = validateTemplateVariables(template);
      expect(result.isValid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
    });

    it('should detect when a required variable is missing in both title and body', () => {
      const template: NotificationTemplateItem = {
        title: 'Order Shipped',
        body: 'Your package has shipped!',
        severity: 'INFO',
        requiredVariables: ['orderNumber'],
      };

      const result = validateTemplateVariables(template);
      expect(result.isValid).toBe(false);
      expect(result.missingVariables).toContain('orderNumber');
    });
  });

  describe('parseNotificationSettings & formatSettingsForBulkUpdate', () => {
    it('should fallback to defaults when settings array is empty', () => {
      const parsed = parseNotificationSettings([]);
      expect(parsed.thresholds.adminPollingIntervalSeconds).toBe(90);
      expect(parsed.thresholds.quietHoursStart).toBe('22:00');
      expect(parsed.thresholds.quietHoursEnd).toBe('08:00');
      expect(parsed.templates).toHaveProperty('ORDER_CONFIRMED');
    });

    it('should parse custom threshold and template settings from raw items', () => {
      const mockSettings: PlatformSettingItem[] = [
        {
          key: 'notification.admin_polling_interval_seconds',
          value: '120',
          type: 'NUMBER',
          group: 'NOTIFICATIONS',
          label: 'Polling',
        },
        {
          key: 'notification.quiet_hours_start',
          value: '23:00',
          type: 'STRING',
          group: 'NOTIFICATIONS',
          label: 'Quiet Start',
        },
        {
          key: 'notification.templates',
          value: JSON.stringify({
            ORDER_CONFIRMED: {
              title: 'Custom Confirmed',
              body: 'Order #{{orderNumber}} ok',
              severity: 'INFO',
            },
          }),
          type: 'JSON',
          group: 'NOTIFICATIONS',
          label: 'Templates',
        },
      ];

      const parsed = parseNotificationSettings(mockSettings);
      expect(parsed.thresholds.adminPollingIntervalSeconds).toBe(120);
      expect(parsed.thresholds.quietHoursStart).toBe('23:00');
      expect(parsed.templates.ORDER_CONFIRMED.title).toBe('Custom Confirmed');
    });

    it('should format templates and thresholds for bulk update correctly', () => {
      const formatted = formatSettingsForBulkUpdate(
        DEFAULT_NOTIFICATION_TEMPLATES_ADMIN,
        DEFAULT_NOTIFICATION_THRESHOLDS,
      );

      const keys = formatted.map((f) => f.key);
      expect(keys).toContain('notification.templates');
      expect(keys).toContain('notification.admin_polling_interval_seconds');
      expect(keys).toContain('notification.quiet_hours_start');
      expect(keys).toContain('notification.critical_cod_threshold');
    });
  });

  describe('TemplateEditorCard Component', () => {
    const mockTemplate: NotificationTemplateItem = {
      title: 'Order Shipped ✈️',
      body: 'Your order #{{orderNumber}} is on the way!',
      severity: 'INFO',
      requiredVariables: ['orderNumber'],
      allowedVariables: ['orderNumber', 'trackingNumber'],
    };

    it('should render event name, title input, and body textarea', () => {
      render(
        <TemplateEditorCard
          eventKey="ORDER_SHIPPED"
          label="Order Shipped"
          template={mockTemplate}
          onChange={vi.fn()}
        />,
      );

      expect(screen.getByText('Order Shipped')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Order Shipped ✈️')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Your order #{{orderNumber}} is on the way!'),
      ).toBeInTheDocument();
      expect(screen.getByText('{{orderNumber}}')).toBeInTheDocument();
      expect(screen.getByText('{{trackingNumber}}')).toBeInTheDocument();
    });

    it('should call onChange when title is edited', () => {
      const handleChange = vi.fn();
      render(
        <TemplateEditorCard
          eventKey="ORDER_SHIPPED"
          label="Order Shipped"
          template={mockTemplate}
          onChange={handleChange}
        />,
      );

      const titleInput = screen.getByDisplayValue('Order Shipped ✈️');
      fireEvent.change(titleInput, { target: { value: 'Flying to you! ✈️' } });

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Flying to you! ✈️' }),
      );
    });
  });

  describe('SettingsThresholdsForm Component', () => {
    it('should render delivery and operational triggers form fields', () => {
      render(
        <SettingsThresholdsForm thresholds={DEFAULT_NOTIFICATION_THRESHOLDS} onChange={vi.fn()} />,
      );

      expect(screen.getByText('Delivery & Quiet Hours')).toBeInTheDocument();
      expect(screen.getByText('Operational Triggers & Risk')).toBeInTheDocument();
      expect(screen.getByDisplayValue('22:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('90')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15000')).toBeInTheDocument();
    });

    it('should trigger onChange when quiet hours start changes', () => {
      const handleChange = vi.fn();
      render(
        <SettingsThresholdsForm
          thresholds={DEFAULT_NOTIFICATION_THRESHOLDS}
          onChange={handleChange}
        />,
      );

      const quietStartInput = screen.getByDisplayValue('22:00');
      fireEvent.change(quietStartInput, { target: { value: '23:30' } });

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({ quietHoursStart: '23:30' }),
      );
    });
  });
});
