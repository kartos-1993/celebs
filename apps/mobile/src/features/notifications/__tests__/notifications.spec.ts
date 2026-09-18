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
});
