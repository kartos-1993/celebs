import type { Notification, Prisma, PrismaClient, PushToken } from '@prisma/client';

import type {
  IUnreadCount,
  NotificationType,
  PushPlatform,
  PushStatus,
} from '@celebs/shared-types';

import defaultPrisma from '@/config/db.prisma';

export interface GetInboxParams {
  userId: string;
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
}

export interface PaginatedInboxResult {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class NotificationRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  // ==========================================
  // PUSH TOKEN OPERATIONS (PostgreSQL Single Source of Truth)
  // ==========================================

  async upsertPushToken(
    userId: string,
    token: string,
    platform: PushPlatform = 'android',
  ): Promise<PushToken> {
    if (!userId || !token) {
      throw new Error('UserId and token are required for upserting push token');
    }

    // 1. Prevent cross-user token collision on shared device switch (Single query, zero loops)
    await this.prisma.pushToken.deleteMany({
      where: {
        token,
        userId: { not: userId },
      },
    });

    // 2. Upsert token record for user
    return this.prisma.pushToken.upsert({
      where: {
        userId_token: { userId, token },
      },
      create: {
        userId,
        token,
        platform,
      },
      update: {
        platform,
      },
    });
  }

  async deletePushToken(userId: string, token: string): Promise<void> {
    if (!userId || !token) return;

    await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });
  }

  async getUserPushTokens(userId: string): Promise<string[]> {
    if (!userId) return [];

    const records = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });

    return records.map((r) => r.token);
  }

  async deleteInvalidPushTokens(tokens: string[]): Promise<void> {
    if (!tokens || tokens.length === 0) return;

    await this.prisma.pushToken.deleteMany({
      where: { token: { in: tokens } },
    });
  }

  async getAudiencePushTokens(audience: string): Promise<{ userId: string; token: string }[]> {
    if (audience === 'CUSTOMERS') {
      return this.prisma.pushToken.findMany({
        where: { user: { role: 'CUSTOMER' } },
        select: { userId: true, token: true },
      });
    }

    if (audience === 'VENDORS') {
      return this.prisma.pushToken.findMany({
        where: { user: { role: { in: ['VENDOR', 'STAFF'] } } },
        select: { userId: true, token: true },
      });
    }

    // Default 'ALL'
    return this.prisma.pushToken.findMany({
      select: { userId: true, token: true },
    });
  }

  // ==========================================
  // INBOX NOTIFICATION OPERATIONS
  // ==========================================

  async createNotification(data: Prisma.NotificationCreateInput): Promise<Notification> {
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

  async getUnreadCount(userId: string): Promise<IUnreadCount> {
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

  async updatePushStatus(id: string, pushStatus: PushStatus): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { pushStatus },
    });
  }
}

export const notificationRepository = new NotificationRepository();
