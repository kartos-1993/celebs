import type { PrismaClient } from '@prisma/client';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { NotificationInboxRepository } from '../notification-inbox.repository';

describe('NotificationInboxRepository (TDD - Red Phase)', () => {
  let repository: NotificationInboxRepository;
  let mockPrisma: {
    notification: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findFirstOrThrow: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      notification: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findFirstOrThrow: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    repository = new NotificationInboxRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('create', () => {
    it('should insert a notification record into PostgreSQL', async () => {
      const mockRecord = {
        id: 'notif-1',
        userId: 'user-123',
        type: 'ORDER_STATUS',
        severity: 'INFO',
        title: 'Order Confirmed',
        body: 'Your order #1001 is confirmed',
        data: { orderId: 'order-1001' },
        read: false,
        pushStatus: 'PENDING',
        channel: 'PUSH',
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(mockRecord);

      const result = await repository.create({
        user: { connect: { id: 'user-123' } },
        type: 'ORDER_STATUS',
        severity: 'INFO',
        title: 'Order Confirmed',
        body: 'Your order #1001 is confirmed',
        data: { orderId: 'order-1001' },
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'ORDER_STATUS',
          title: 'Order Confirmed',
        }),
      });
      expect(result.id).toBe('notif-1');
    });
  });

  describe('getInbox', () => {
    it('should return paginated notifications sorted by createdAt DESC', async () => {
      const mockItems = [
        { id: 'n-1', userId: 'user-123', title: 'Item 1', createdAt: new Date() },
        { id: 'n-2', userId: 'user-123', title: 'Item 2', createdAt: new Date() },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockItems);
      mockPrisma.notification.count.mockResolvedValue(25);

      const result = await repository.getInbox({
        userId: 'user-123',
        page: 2,
        limit: 10,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by type and unreadOnly when specified', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await repository.getInbox({
        userId: 'user-123',
        type: 'ORDER_STATUS',
        unreadOnly: true,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          type: 'ORDER_STATUS',
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count and hasCritical: true when unread critical notification exists', async () => {
      mockPrisma.notification.count
        .mockResolvedValueOnce(5) // total unread
        .mockResolvedValueOnce(1); // critical unread

      const result = await repository.getUnreadCount('user-123');

      expect(result).toEqual({ count: 5, hasCritical: true });
      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(1, {
        where: { userId: 'user-123', read: false },
      });
      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(2, {
        where: { userId: 'user-123', read: false, severity: 'CRITICAL' },
      });
    });

    it('should return count and hasCritical: false when no critical unread exists', async () => {
      mockPrisma.notification.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

      const result = await repository.getUnreadCount('user-123');

      expect(result).toEqual({ count: 3, hasCritical: false });
    });
  });

  describe('markAsRead', () => {
    it('should verify ownership with findFirstOrThrow and mark notification as read', async () => {
      const mockRecord = { id: 'n-1', userId: 'user-123', read: false };
      const updatedRecord = { id: 'n-1', userId: 'user-123', read: true };

      mockPrisma.notification.findFirstOrThrow.mockResolvedValue(mockRecord);
      mockPrisma.notification.update.mockResolvedValue(updatedRecord);

      const result = await repository.markAsRead('n-1', 'user-123');

      expect(mockPrisma.notification.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'n-1', userId: 'user-123' },
      });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n-1' },
        data: { read: true },
      });
      expect(result.read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for the user', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 4 });

      const result = await repository.markAllAsRead('user-123');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', read: false },
        data: { read: true },
      });
      expect(result).toEqual({ count: 4 });
    });
  });

  describe('getById', () => {
    it('should return notification by id and userId with strict guarantee', async () => {
      const mockRecord = { id: 'n-1', userId: 'user-123', title: 'Test' };
      mockPrisma.notification.findFirstOrThrow.mockResolvedValue(mockRecord);

      const result = await repository.getById('n-1', 'user-123');

      expect(mockPrisma.notification.findFirstOrThrow).toHaveBeenCalledWith({
        where: { id: 'n-1', userId: 'user-123' },
      });
      expect(result).toEqual(mockRecord);
    });
  });
});
