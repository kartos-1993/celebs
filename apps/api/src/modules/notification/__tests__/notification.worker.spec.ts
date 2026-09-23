import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationSeverity, NotificationType } from '@celebs/shared-types';

import { ExpoPushService } from '../expo-push.service';
import type { NotificationRepository } from '../notification.repository';
import type { NotificationJobPayload } from '../notification.worker';
import { processNotificationJob } from '../notification.worker';
import { calculateQuietHoursDelay, shouldApplyQuietHours } from '../notification-quiet-hours.util';

import type { UserRepository } from '@/modules/user/user.repository';

describe('Notification Worker & Quiet Hours', () => {
  describe('calculateQuietHoursDelay', () => {
    it('should calculate delay until 08:00 AM NPT when time is 23:00 NPT (quiet hours)', () => {
      // 23:00 NPT is 17:15 UTC
      const lateNightUtc = new Date('2026-09-17T17:15:00.000Z');
      const result = calculateQuietHoursDelay(lateNightUtc);

      expect(result.inQuietHours).toBe(true);
      expect(result.delayMs).toBeGreaterThan(0);
      // Expected delay should be around 9 hours (9 * 3600 * 1000 = 32,400,000 ms)
      expect(result.delayMs).toBeCloseTo(9 * 3600 * 1000, -5);
    });

    it('should report inQuietHours = false and 0 delay when time is 14:00 NPT (daytime)', () => {
      // 14:00 NPT is 08:15 UTC
      const dayTimeUtc = new Date('2026-09-17T08:15:00.000Z');
      const result = calculateQuietHoursDelay(dayTimeUtc);

      expect(result.inQuietHours).toBe(false);
      expect(result.delayMs).toBe(0);
    });

    it('should bypass quiet hours for CRITICAL severity or transactional types', () => {
      expect(shouldApplyQuietHours('ORDER_STATUS', 'INFO')).toBe(false);
      expect(shouldApplyQuietHours('PAYMENT', 'INFO')).toBe(false);
      expect(shouldApplyQuietHours('BROADCAST', 'CRITICAL')).toBe(false);
      expect(shouldApplyQuietHours('BROADCAST', 'INFO')).toBe(true);
      expect(shouldApplyQuietHours('PRICE_DROP', 'INFO')).toBe(true);
    });
  });

  describe('ExpoPushService chunking & delivery', () => {
    let pushService: ExpoPushService;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      pushService = new ExpoPushService(mockFetch as unknown as typeof fetch, {
        pushUrl: 'https://exp.host/--/api/v2/push/send',
        receiptsUrl: 'https://exp.host/--/api/v2/push/getReceipts',
        accessToken: 'test-expo-token',
      });
    });

    it('should chunk 250 tokens into 3 HTTP requests (100, 100, 50)', async () => {
      const tokens = Array.from({ length: 250 }, (_, i) => `ExponentPushToken[token-${i}]`);
      const messages = tokens.map((token) => ({
        to: token,
        title: 'Flash Sale',
        body: 'Huge discounts today!',
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: Array.from({ length: 100 }, () => ({ status: 'ok', id: 'rec-1' })),
        }),
      });

      const tickets = await pushService.sendPushNotifications(messages);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(tickets.length).toBe(300); // 3 chunks x mock responses
    });

    it('should include Authorization bearer token in request headers when configured', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      await pushService.sendPushNotifications([
        { to: 'ExponentPushToken[test]', title: 'T', body: 'B' },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-expo-token',
          }),
        }),
      );
    });

    it('should identify DeviceNotRegistered errors for token pruning', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { status: 'ok', id: 'rec-valid' },
            {
              status: 'error',
              message: 'Device not registered',
              details: { error: 'DeviceNotRegistered' },
            },
          ],
        }),
      });

      const tickets = await pushService.sendPushNotifications([
        { to: 'ExponentPushToken[valid]', title: 'Test', body: 'Msg' },
        { to: 'ExponentPushToken[stale]', title: 'Test', body: 'Msg' },
      ]);

      const invalidTokens = pushService.extractInvalidTokens(tickets, [
        'ExponentPushToken[valid]',
        'ExponentPushToken[stale]',
      ]);

      expect(invalidTokens).toEqual(['ExponentPushToken[stale]']);
    });
  });

  describe('processNotificationJob & mailQueue fallback', () => {
    let mockRepo: {
      getUserPushTokens: ReturnType<typeof vi.fn>;
      deleteInvalidPushTokens: ReturnType<typeof vi.fn>;
      updatePushStatus: ReturnType<typeof vi.fn>;
    };
    let mockMailQueue: {
      add: ReturnType<typeof vi.fn>;
    };
    let mockUserRepo: {
      findUserWithPreferences: ReturnType<typeof vi.fn>;
    };
    let mockPushService: {
      sendPushNotifications: ReturnType<typeof vi.fn>;
      extractInvalidTokens: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockRepo = {
        getUserPushTokens: vi.fn(),
        deleteInvalidPushTokens: vi.fn(),
        updatePushStatus: vi.fn(),
      };
      mockMailQueue = {
        add: vi.fn(),
      };
      mockUserRepo = {
        findUserWithPreferences: vi.fn(),
      };
      mockPushService = {
        sendPushNotifications: vi.fn(),
        extractInvalidTokens: vi.fn(),
      };
    });

    it('should fallback to mailQueue when user has no push tokens for critical ORDER_STATUS', async () => {
      mockRepo.getUserPushTokens.mockResolvedValue([]);
      mockUserRepo.findUserWithPreferences.mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        userPreferences: { pushOrderUpdates: true },
      });

      const jobData: NotificationJobPayload = {
        notificationId: 'notif-100',
        userId: 'user-1',
        type: 'ORDER_STATUS' as NotificationType,
        severity: 'CRITICAL' as NotificationSeverity,
        title: 'Order Cancelled',
        body: 'Your order #999 was cancelled',
      };

      const result = await processNotificationJob(
        jobData,
        mockRepo as unknown as NotificationRepository,
        mockPushService as unknown as ExpoPushService,
        mockMailQueue as unknown as Queue,
        mockUserRepo as unknown as UserRepository,
      );

      expect(result.fallbackToMail).toBe(true);
      expect(mockMailQueue.add).toHaveBeenCalledWith(
        'send',
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'Order Cancelled',
        }),
        expect.any(Object),
      );
      expect(mockRepo.updatePushStatus).toHaveBeenCalledWith('notif-100', 'SKIPPED');
    });

    it('should deliver push and prune stale tokens when DeviceNotRegistered occurs', async () => {
      mockRepo.getUserPushTokens.mockResolvedValue(['ExponentPushToken[stale]']);
      mockUserRepo.findUserWithPreferences.mockResolvedValue({
        id: 'user-1',
        email: 'customer@example.com',
        userPreferences: { pushOrderUpdates: true },
      });
      mockPushService.sendPushNotifications.mockResolvedValue([
        {
          status: 'error',
          details: { error: 'DeviceNotRegistered' },
        },
      ]);
      mockPushService.extractInvalidTokens.mockReturnValue(['ExponentPushToken[stale]']);

      const jobData: NotificationJobPayload = {
        notificationId: 'notif-200',
        userId: 'user-1',
        type: 'ORDER_STATUS' as NotificationType,
        severity: 'INFO' as NotificationSeverity,
        title: 'Order Packed',
        body: 'Your package is on its way',
      };

      const result = await processNotificationJob(
        jobData,
        mockRepo as unknown as NotificationRepository,
        mockPushService as unknown as ExpoPushService,
        mockMailQueue as unknown as Queue,
        mockUserRepo as unknown as UserRepository,
      );

      expect(mockRepo.deleteInvalidPushTokens).toHaveBeenCalledWith(['ExponentPushToken[stale]']);
      expect(result.delivered).toBe(true);
      expect(mockRepo.updatePushStatus).toHaveBeenCalledWith('notif-200', 'SENT');
    });
  });
});
