import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

import { NOTIFICATIONS_QUERY_KEYS } from '../api';
import { NotificationBell } from '../components/notification-bell';
import { NotificationItem } from '../components/notification-item';
import { formatRelativeTime } from '../lib/notification-format.util';
import type { NotificationItemUI } from '../types';

describe('Notifications Feature (TDD Phase 3)', () => {
  describe('NOTIFICATIONS_QUERY_KEYS', () => {
    it('should generate canonical query keys matching factory pattern', () => {
      expect(NOTIFICATIONS_QUERY_KEYS.all).toEqual(['notifications']);
      expect(NOTIFICATIONS_QUERY_KEYS.unreadCount()).toEqual(['notifications', 'unread-count']);
      expect(NOTIFICATIONS_QUERY_KEYS.lists()).toEqual(['notifications', 'list']);
      expect(NOTIFICATIONS_QUERY_KEYS.list({ page: 1, limit: 10 })).toEqual([
        'notifications',
        'list',
        { page: 1, limit: 10 },
      ]);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format timestamps using date-fns relative formatting', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const formatted = formatRelativeTime(fiveMinutesAgo);
      expect(formatted).toMatch(/5m ago|5 minutes ago/i);
    });
  });

  describe('NotificationBell Component', () => {
    it('should render bell icon without badge when unread count is 0', () => {
      render(<NotificationBell count={0} hasCritical={false} onClick={vi.fn()} />);

      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });

    it('should display exact count badge when unread count is positive', () => {
      render(<NotificationBell count={7} hasCritical={false} onClick={vi.fn()} />);

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('7');
    });

    it('should cap badge count at 99+ when count exceeds 99', () => {
      render(<NotificationBell count={150} hasCritical={false} onClick={vi.fn()} />);

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toHaveTextContent('99+');
    });

    it('should apply critical pulse indicator when hasCritical is true', () => {
      render(<NotificationBell count={2} hasCritical={true} onClick={vi.fn()} />);

      const criticalIndicator = screen.getByTestId('critical-indicator');
      expect(criticalIndicator).toBeInTheDocument();
    });
  });

  describe('NotificationItem Component', () => {
    const mockItem: NotificationItemUI = {
      id: 'notif-101',
      type: 'ORDER_STATUS',
      severity: 'CRITICAL',
      title: 'Out for Delivery 🚚',
      body: 'Your package #1042 is out for delivery today!',
      read: false,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };

    it('should render title, body, and relative timestamp', () => {
      render(<NotificationItem item={mockItem} onMarkRead={vi.fn()} />);

      expect(screen.getByText('Out for Delivery 🚚')).toBeInTheDocument();
      expect(screen.getByText('Your package #1042 is out for delivery today!')).toBeInTheDocument();
      expect(screen.getByText(/10m ago|10 minutes ago/i)).toBeInTheDocument();
    });

    it('should invoke onMarkRead when unread notification is clicked', () => {
      const handleMarkRead = vi.fn();
      render(<NotificationItem item={mockItem} onMarkRead={handleMarkRead} />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleMarkRead).toHaveBeenCalledWith('notif-101');
    });
  });
});
