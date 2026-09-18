import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRepository } from '../notification.repository';
import { NotificationService } from '../notification.service';

describe('NotificationService (TDD - Ponytail Consolidated)', () => {
  let service: NotificationService;
  let mockRepo: {
    upsertPushToken: ReturnType<typeof vi.fn>;
    deletePushToken: ReturnType<typeof vi.fn>;
    getUserPushTokens: ReturnType<typeof vi.fn>;
    getAudiencePushTokens: ReturnType<typeof vi.fn>;
    createNotification: ReturnType<typeof vi.fn>;
    getInbox: ReturnType<typeof vi.fn>;
    getUnreadCount: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
  };
  let mockQueue: {
    add: ReturnType<typeof vi.fn>;
    addBulk: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepo = {
      upsertPushToken: vi.fn(),
      deletePushToken: vi.fn(),
      getUserPushTokens: vi.fn(),
      getAudiencePushTokens: vi.fn(),
      createNotification: vi.fn(),
      getInbox: vi.fn(),
      getUnreadCount: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };
    mockQueue = {
      add: vi.fn(),
      addBulk: vi.fn(),
    };

    service = new NotificationService(
      mockRepo as unknown as NotificationRepository,
      mockQueue as unknown as Queue,
    );
  });

  describe('registerPushToken', () => {
    it('should register a valid Expo push token with platform', async () => {
      await service.registerPushToken('user-1', {
        pushToken: 'ExponentPushToken[device-token-1234567890]',
        platform: 'android',
      });

      expect(mockRepo.upsertPushToken).toHaveBeenCalledWith(
        'user-1',
        'ExponentPushToken[device-token-1234567890]',
        'android',
      );
    });
  });

  describe('unregisterPushToken', () => {
    it('should remove push token for the user', async () => {
      await service.unregisterPushToken('user-1', 'ExponentPushToken[device-token-1234567890]');

      expect(mockRepo.deletePushToken).toHaveBeenCalledWith(
        'user-1',
        'ExponentPushToken[device-token-1234567890]',
      );
    });
  });

  describe('createNotification & notifyOrderStatus', () => {
    it('should persist notification to PostgreSQL and enqueue BullMQ job with deduplication jobId', async () => {
      mockRepo.createNotification.mockResolvedValueOnce({
        id: 'notif-1',
        userId: 'user-1',
        type: 'ORDER_STATUS',
        severity: 'INFO',
        title: 'Order Shipped ✈️',
        body: 'Your order #1001 is on its way!',
      });

      await service.notifyOrderStatus({
        userId: 'user-1',
        orderId: 'order-1',
        orderNumber: '1001',
        status: 'SHIPPED',
      });

      expect(mockRepo.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_STATUS',
          severity: 'INFO',
          title: 'Order Shipped ✈️',
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'push',
        expect.objectContaining({
          notificationId: 'notif-1',
          userId: 'user-1',
          type: 'ORDER_STATUS',
        }),
        expect.objectContaining({
          jobId: 'order:order-1:SHIPPED',
        }),
      );
    });
  });

  describe('inbox operations', () => {
    it('should delegate getInbox to repository with pagination and storeId', async () => {
      const mockResult = { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
      mockRepo.getInbox.mockResolvedValueOnce(mockResult);

      const result = await service.getInbox('user-1', { page: 1, limit: 20 }, 'store-abc');

      expect(mockRepo.getInbox).toHaveBeenCalledWith({
        userId: 'user-1',
        storeId: 'store-abc',
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockResult);
    });

    it('should delegate getUnreadCount to repository with storeId', async () => {
      mockRepo.getUnreadCount.mockResolvedValueOnce({ count: 3, hasCritical: false });

      const result = await service.getUnreadCount('user-1', 'store-abc');

      expect(mockRepo.getUnreadCount).toHaveBeenCalledWith('user-1', 'store-abc');
      expect(result).toEqual({ count: 3, hasCritical: false });
    });

    it('should delegate markAsRead to repository with storeId', async () => {
      mockRepo.markAsRead.mockResolvedValueOnce({ id: 'n-1', read: true });

      const result = await service.markAsRead('user-1', 'n-1', 'store-abc');

      expect(mockRepo.markAsRead).toHaveBeenCalledWith('n-1', 'user-1', 'store-abc');
      expect(result.read).toBe(true);
    });

    it('should delegate markAllAsRead to repository with storeId', async () => {
      mockRepo.markAllAsRead.mockResolvedValueOnce({ count: 5 });

      const result = await service.markAllAsRead('user-1', 'store-abc');

      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-1', 'store-abc');
      expect(result).toEqual({ count: 5 });
    });

    it('should delegate getVendorNotificationsForAdmin to repository', async () => {
      const mockResult = { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
      mockRepo.getVendorNotificationsForAdmin = vi.fn().mockResolvedValueOnce(mockResult);

      const result = await service.getVendorNotificationsForAdmin('store-xyz', {
        page: 1,
        limit: 10,
      });

      expect(mockRepo.getVendorNotificationsForAdmin).toHaveBeenCalledWith('store-xyz', {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('broadcast', () => {
    it('should fetch tokens by audience, chunk into batches of 100 and atomic bulk enqueue jobs', async () => {
      const mockTokens = Array.from({ length: 150 }, (_, i) => ({
        userId: `user-${i}`,
        token: `ExponentPushToken[token-${i}]`,
      }));
      mockRepo.getAudiencePushTokens.mockResolvedValueOnce(mockTokens);

      const result = await service.broadcast('admin-1', {
        title: 'Mega Flash Sale!',
        body: 'Up to 50% off all items',
        targetAudience: 'CUSTOMERS',
      });

      expect(mockRepo.getAudiencePushTokens).toHaveBeenCalledWith('CUSTOMERS');
      expect(mockQueue.addBulk).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'broadcast-chunk',
            data: expect.objectContaining({ tokens: expect.any(Array) }),
          }),
        ]),
      );
      expect(result.dispatchedCount).toBe(150);
    });
  });
});
