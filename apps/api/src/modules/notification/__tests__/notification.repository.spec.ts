import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationRepository } from '../notification.repository';

describe('NotificationRepository', () => {
  let mockPrisma: {
    pushToken: {
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    notification: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findFirstOrThrow: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let repository: NotificationRepository;

  beforeEach(() => {
    mockPrisma = {
      pushToken: {
        upsert: vi
          .fn()
          .mockResolvedValue({ id: 'token-1', userId: 'user-1', token: 'ExponentPushToken[1]' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      notification: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findFirstOrThrow: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    repository = new NotificationRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('Push Token operations', () => {
    it('should upsert token and delete any existing mapping for other users', async () => {
      await repository.upsertPushToken('user-1', 'ExponentPushToken[device-1]', 'android');

      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: {
          token: 'ExponentPushToken[device-1]',
          userId: { not: 'user-1' },
        },
      });

      expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith({
        where: { userId_token: { userId: 'user-1', token: 'ExponentPushToken[device-1]' } },
        create: { userId: 'user-1', token: 'ExponentPushToken[device-1]', platform: 'android' },
        update: { platform: 'android' },
      });
    });

    it('should delete push token for user', async () => {
      await repository.deletePushToken('user-1', 'ExponentPushToken[device-1]');

      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'ExponentPushToken[device-1]' },
      });
    });

    it('should retrieve user push tokens from PostgreSQL', async () => {
      mockPrisma.pushToken.findMany.mockResolvedValueOnce([
        { token: 'ExponentPushToken[token-1]' },
      ]);

      const tokens = await repository.getUserPushTokens('user-1');

      expect(tokens).toEqual(['ExponentPushToken[token-1]']);
      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { token: true },
      });
    });

    it('should batch delete invalid push tokens', async () => {
      await repository.deleteInvalidPushTokens(['ExponentPushToken[invalid]']);

      expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ['ExponentPushToken[invalid]'] } },
      });
    });

    it('should retrieve audience tokens for CUSTOMERS, VENDORS, and ALL', async () => {
      await repository.getAudiencePushTokens('CUSTOMERS');
      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { user: { role: 'CUSTOMER' } },
        select: { userId: true, token: true },
      });

      await repository.getAudiencePushTokens('VENDORS');
      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        where: { user: { role: { in: ['VENDOR', 'STAFF'] } } },
        select: { userId: true, token: true },
      });

      await repository.getAudiencePushTokens('ALL');
      expect(mockPrisma.pushToken.findMany).toHaveBeenCalledWith({
        select: { userId: true, token: true },
      });
    });
  });

  describe('Inbox Notification operations', () => {
    it('should create notification in PostgreSQL', async () => {
      const mockNotif = { id: 'notif-1', title: 'Test' };
      mockPrisma.notification.create.mockResolvedValueOnce(mockNotif);

      const result = await repository.createNotification({
        user: { connect: { id: 'user-1' } },
        type: 'ORDER_STATUS',
        title: 'Order Confirmed',
        body: 'Your order was placed',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(result).toEqual(mockNotif);
    });

    it('should return paginated inbox items sorted by createdAt DESC for personal inbox (storeId null)', async () => {
      mockPrisma.notification.findMany.mockResolvedValueOnce([{ id: 'n-1' }]);
      mockPrisma.notification.count.mockResolvedValueOnce(15);

      const result = await repository.getInbox({ userId: 'user-1', page: 2, limit: 10 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', vendorId: null },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(result.totalPages).toBe(2);
      expect(result.total).toBe(15);
    });

    it('should return paginated inbox items scoped to storeId when storeId is provided (Vendor Tenancy)', async () => {
      mockPrisma.notification.findMany.mockResolvedValueOnce([{ id: 'v-1' }]);
      mockPrisma.notification.count.mockResolvedValueOnce(5);

      const result = await repository.getInbox({
        userId: 'user-1',
        storeId: 'store-abc',
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ vendorId: 'store-abc' }, { userId: 'user-1', vendorId: null }],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result.items).toEqual([{ id: 'v-1' }]);
    });

    it('should calculate unread count scoped to storeId when provided', async () => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(3) // unread count
        .mockResolvedValueOnce(1); // critical unread count

      const result = await repository.getUnreadCount('user-1', 'store-abc');

      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(1, {
        where: {
          OR: [{ vendorId: 'store-abc' }, { userId: 'user-1', vendorId: null }],
          read: false,
        },
      });
      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(2, {
        where: {
          OR: [{ vendorId: 'store-abc' }, { userId: 'user-1', vendorId: null }],
          read: false,
          severity: 'CRITICAL',
        },
      });
      expect(result).toEqual({ count: 3, hasCritical: true });
    });

    it('should calculate personal unread count with vendorId: null when storeId not provided', async () => {
      mockPrisma.notification.count.mockResolvedValueOnce(4).mockResolvedValueOnce(0);

      const result = await repository.getUnreadCount('user-1');

      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(1, {
        where: { userId: 'user-1', vendorId: null, read: false },
      });
      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(2, {
        where: { userId: 'user-1', vendorId: null, read: false, severity: 'CRITICAL' },
      });
      expect(result).toEqual({ count: 4, hasCritical: false });
    });

    it('should mark single notification as read scoped to storeId when provided', async () => {
      mockPrisma.notification.findFirstOrThrow.mockResolvedValueOnce({
        id: 'n-1',
        vendorId: 'store-abc',
      });
      mockPrisma.notification.update.mockResolvedValueOnce({ id: 'n-1', read: true });

      const result = await repository.markAsRead('n-1', 'user-1', 'store-abc');

      expect(mockPrisma.notification.findFirstOrThrow).toHaveBeenCalledWith({
        where: {
          id: 'n-1',
          OR: [{ vendorId: 'store-abc' }, { userId: 'user-1', vendorId: null }],
        },
      });
      expect(result.read).toBe(true);
    });

    it('should mark all notifications as read scoped to storeId when provided', async () => {
      mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 7 });

      const result = await repository.markAllAsRead('user-1', 'store-abc');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [{ vendorId: 'store-abc' }, { userId: 'user-1', vendorId: null }],
          read: false,
        },
        data: { read: true },
      });
      expect(result).toEqual({ count: 7 });
    });

    it('should support administrative inspection of vendor notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValueOnce([{ id: 'audit-1' }]);
      mockPrisma.notification.count.mockResolvedValueOnce(1);

      const result = await repository.getVendorNotificationsForAdmin('store-xyz', {
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { vendorId: 'store-xyz' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result.items).toEqual([{ id: 'audit-1' }]);
    });
  });
});
