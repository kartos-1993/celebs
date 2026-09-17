import type { Notification,Prisma, PrismaClient } from '@prisma/client';

import prisma from '@/config/db.prisma';

export interface GetInboxParams {
  userId: string;
  page?: number;
  limit?: number;
  type?: string;
  unreadOnly?: boolean;
}

export interface PaginatedInboxResult {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResult {
  count: number;
  hasCritical: boolean;
}

export class NotificationInboxRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  async getInbox(params: GetInboxParams): Promise<PaginatedInboxResult> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(params.limit || 20, 100));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId: params.userId,
      ...(params.type ? { type: params.type } : {}),
      ...(params.unreadOnly ? { read: false } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResult> {
    const [count, criticalCount] = await Promise.all([
      this.prisma.notification.count({
        where: { userId, read: false },
      }),
      this.prisma.notification.count({
        where: { userId, read: false, severity: 'CRITICAL' },
      }),
    ]);

    return {
      count,
      hasCritical: criticalCount > 0,
    };
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const existing = await this.prisma.notification.findFirstOrThrow({
      where: { id, userId },
    });

    return this.prisma.notification.update({
      where: { id: existing.id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getById(id: string, userId: string): Promise<Notification> {
    return this.prisma.notification.findFirstOrThrow({
      where: { id, userId },
    });
  }

  async updatePushStatus(id: string, pushStatus: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { pushStatus },
    });
  }
}

export const notificationInboxRepository = new NotificationInboxRepository();
