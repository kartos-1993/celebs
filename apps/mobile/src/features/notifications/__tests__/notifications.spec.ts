import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { NOTIFICATION_QUERY_KEYS } from '../api';
import type { NotificationItemMobile } from '../types';
import { filterNotificationsByTab } from '../utils/notification-filter.util';
import { resolveNotificationRoute } from '../utils/notification-navigation.util';
import { formatRelativeTime } from '../utils/notification-time.util';

describe('Mobile Notifications Suite (TDD Phase 5)', () => {
  describe('formatRelativeTime', () => {
    it('should format timestamps within seconds as just now', () => {
      const nowIso = new Date().toISOString();
      expect(formatRelativeTime(nowIso)).toBe('just now');
    });

    it('should format minutes ago accurately', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
    });

    it('should format hours ago accurately', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should format days ago accurately', () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 86400 * 1000).toISOString();
      expect(formatRelativeTime(fourDaysAgo)).toBe('4d ago');
    });

    it('should handle invalid date string safely', () => {
      expect(formatRelativeTime('invalid-date')).toBe('just now');
    });
  });

  describe('NOTIFICATION_QUERY_KEYS Factory', () => {
    it('should generate hierarchical query keys', () => {
      expect(NOTIFICATION_QUERY_KEYS.all).toEqual(['notifications']);
      expect(NOTIFICATION_QUERY_KEYS.unreadCount()).toEqual(['notifications', 'unread-count']);
      expect(NOTIFICATION_QUERY_KEYS.lists()).toEqual(['notifications', 'list']);
      expect(NOTIFICATION_QUERY_KEYS.list({ unreadOnly: true })).toEqual([
        'notifications',
        'list',
        { unreadOnly: true },
      ]);
      expect(NOTIFICATION_QUERY_KEYS.pushTokens()).toEqual(['notifications', 'push-tokens']);
    });
  });

  describe('filterNotificationsByTab', () => {
    const mockItems: NotificationItemMobile[] = [
      {
        id: '1',
        type: 'ORDER_STATUS',
        channel: 'PUSH',
        severity: 'INFO',
        title: 'Order Confirmed',
        body: '',
        isRead: false,
        createdAt: '',
      },
      {
        id: '2',
        type: 'PAYMENT',
        channel: 'PUSH',
        severity: 'INFO',
        title: 'Payment Confirmed',
        body: '',
        isRead: false,
        createdAt: '',
      },
      {
        id: '3',
        type: 'BROADCAST',
        channel: 'PUSH',
        severity: 'INFO',
        title: 'Flash Sale',
        body: '',
        isRead: false,
        createdAt: '',
      },
      {
        id: '4',
        type: 'PRICE_DROP',
        channel: 'PUSH',
        severity: 'INFO',
        title: 'Price Alert',
        body: '',
        isRead: false,
        createdAt: '',
      },
    ];

    it('should return all items when ALL tab is selected', () => {
      expect(filterNotificationsByTab(mockItems, 'ALL')).toHaveLength(4);
    });

    it('should return only order-related notifications when ORDERS tab is selected', () => {
      const orders = filterNotificationsByTab(mockItems, 'ORDERS');
      expect(orders).toHaveLength(2);
      expect(orders.map((o) => o.id)).toEqual(['1', '2']);
    });

    it('should return only marketing and promotional notifications when OFFERS tab is selected', () => {
      const offers = filterNotificationsByTab(mockItems, 'OFFERS');
      expect(offers).toHaveLength(2);
      expect(offers.map((o) => o.id)).toEqual(['3', '4']);
    });
  });

  describe('resolveNotificationRoute', () => {
    it('should resolve orderId directly to order-detail pathname and params', () => {
      const notif: NotificationItemMobile = {
        id: 'n-1',
        title: 'Order Shipped',
        body: 'On the way',
        channel: 'PUSH',
        severity: 'INFO',
        type: 'ORDER_STATUS',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: { orderId: 'ord-123' },
      };
      expect(resolveNotificationRoute(notif)).toEqual({
        pathname: '/order-detail',
        params: { orderId: 'ord-123' },
      });
    });

    it('should extract orderId from backend /orders/:orderId url pattern', () => {
      const notif: NotificationItemMobile = {
        id: 'n-2',
        title: 'Order Placed',
        body: 'Confirmed',
        channel: 'PUSH',
        severity: 'INFO',
        type: 'ORDER_STATUS',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: { url: '/orders/ord-456' },
      };
      expect(resolveNotificationRoute(notif)).toEqual({
        pathname: '/order-detail',
        params: { orderId: 'ord-456' },
      });
    });

    it('should route to orders list if url is /orders', () => {
      const notif: NotificationItemMobile = {
        id: 'n-3',
        title: 'Review Orders',
        body: 'Check your orders',
        channel: 'PUSH',
        severity: 'INFO',
        type: 'ORDER_STATUS',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: { url: '/orders' },
      };
      expect(resolveNotificationRoute(notif)).toBe('/orders');
    });

    it('should resolve productId directly to product detail route', () => {
      const notif: NotificationItemMobile = {
        id: 'n-4',
        title: 'Price Drop',
        body: 'On sale now',
        channel: 'PUSH',
        severity: 'INFO',
        type: 'PRICE_DROP',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: { productId: 'prod-789' },
      };
      expect(resolveNotificationRoute(notif)).toEqual({
        pathname: '/product/[id]',
        params: { id: 'prod-789' },
      });
    });

    it('should return null when no data or matching route is available', () => {
      const notif: NotificationItemMobile = {
        id: 'n-5',
        title: 'Welcome',
        body: 'Hello',
        channel: 'PUSH',
        severity: 'INFO',
        type: 'SYSTEM',
        isRead: true,
        createdAt: new Date().toISOString(),
      };
      expect(resolveNotificationRoute(notif)).toBeNull();
    });
  });
});
