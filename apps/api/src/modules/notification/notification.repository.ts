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
  storeId?: string | null;
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

    // 2. Upsert token record
    return this.prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      create: { userId, token, platform },
      update: { platform },
    });
  }

  async deletePushToken(userId: string, token: string): Promise<void> {
    if (!userId || !token) return;

    await this.prisma.pushToken.deleteMany({
      where: { userId, token },
    });
  }

  async getUserPushTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  }

  async deleteInvalidPushTokens(tokens: string[]): Promise<number> {
    if (tokens.length === 0) return 0;
    const result = await this.prisma.pushToken.deleteMany({
      where: { token: { in: tokens } },
    });
    return result.count;
  }

  async getAudiencePushTokens(
    audience: 'CUSTOMERS' | 'VENDORS' | 'ALL',
  ): Promise<{ userId: string; token: string }[]> {
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

  async getAdminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  async getStoreUserIdsMap(storeIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (storeIds.length === 0) return map;

    for (const storeId of storeIds) {
      map.set(storeId, []);
    }

    const [stores, staffList] = await Promise.all([
      this.prisma.vendorProfile.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, userId: true },
      }),
      this.prisma.user.findMany({
        where: { vendorId: { in: storeIds } },
        select: { id: true, vendorId: true },
      }),
    ]);

    for (const store of stores) {
      const list = map.get(store.id) || [];
      if (store.userId && !list.includes(store.userId)) {
        list.push(store.userId);
      }
      map.set(store.id, list);
    }

    for (const staff of staffList) {
      if (staff.vendorId) {
        const list = map.get(staff.vendorId) || [];
        if (staff.id && !list.includes(staff.id)) {
          list.push(staff.id);
        }
        map.set(staff.vendorId, list);
      }
    }

    return map;
  }

  async getStoreUserIds(storeId: string): Promise<string[]> {
    const map = await this.getStoreUserIdsMap([storeId]);
    return map.get(storeId) || [];
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
      ...(params.storeId
        ? { OR: [{ vendorId: params.storeId }, { userId: params.userId, vendorId: null }] }
        : { userId: params.userId, vendorId: null }),
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

  async getUnreadCount(userId: string, storeId?: string | null): Promise<IUnreadCount> {
    const baseWhere: Prisma.NotificationWhereInput = storeId
      ? { OR: [{ vendorId: storeId }, { userId, vendorId: null }], read: false }
      : { userId, vendorId: null, read: false };

    const [count, criticalCount] = await Promise.all([
      this.prisma.notification.count({ where: baseWhere }),
      this.prisma.notification.count({
        where: { ...baseWhere, severity: 'CRITICAL' },
      }),
    ]);

    return {
      count,
      hasCritical: criticalCount > 0,
    };
  }

  async markAsRead(id: string, userId: string, storeId?: string | null): Promise<Notification> {
    const existing = await this.prisma.notification.findFirstOrThrow({
      where: storeId
        ? { id, OR: [{ vendorId: storeId }, { userId, vendorId: null }] }
        : { id, userId, vendorId: null },
    });

    return this.prisma.notification.update({
      where: { id: existing.id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string, storeId?: string | null): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: storeId
        ? { OR: [{ vendorId: storeId }, { userId, vendorId: null }], read: false }
        : { userId, vendorId: null, read: false },
      data: { read: true },
    });
  }

  async getVendorNotificationsForAdmin(
    vendorId: string,
    params: { page?: number; limit?: number; type?: NotificationType } = {},
  ): Promise<PaginatedInboxResult> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(params.limit || 20, 100));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      vendorId,
      ...(params.type ? { type: params.type } : {}),
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

  async updatePushStatus(id: string, pushStatus: PushStatus): Promise<Notification | null> {
    try {
      return await this.prisma.notification.update({
        where: { id },
        data: { pushStatus },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        return null;
      }
      throw error;
    }
  }
}

export const notificationRepository = new NotificationRepository();
