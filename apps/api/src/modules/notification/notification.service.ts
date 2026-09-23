import { type Notification, Prisma } from '@prisma/client';
import type { Queue } from 'bullmq';

import type {
  BroadcastPayloadInput,
  GetInboxQueryInput,
  IUnreadCount,
  NotificationChannel,
  NotificationSeverity,
  NotificationType,
  RegisterPushTokenInput,
} from '@celebs/shared-types';
import { logger } from '@celebs/shared-utils';

import {
  PlatformSettingsRepository,
  platformSettingsRepository,
} from '../platform-settings/platform-settings.repository';

import type { PaginatedInboxResult } from './notification.repository';
import { NotificationRepository, notificationRepository } from './notification.repository';
import type { OrderNotificationParams } from './notification.types';
import { resolveNotificationTemplate } from './template-interpolator.util';

import { notificationQueue } from '@/common/services/queue.service';

export interface CreateNotificationParams {
  userId: string;
  vendorId?: string | null;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
  dedupKey?: string;
}

export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository = notificationRepository,
    private readonly queue: Queue = notificationQueue,
    private readonly settingsRepo: PlatformSettingsRepository = platformSettingsRepository,
  ) {}

  async registerPushToken(userId: string, input: RegisterPushTokenInput): Promise<void> {
    await this.repo.upsertPushToken(userId, input.pushToken, input.platform);
    logger.info(
      { userId, platform: input.platform },
      '[NotificationService] Registered push token',
    );
  }

  async unregisterPushToken(userId: string, pushToken: string): Promise<void> {
    if (!userId || !pushToken) return;
    await this.repo.deletePushToken(userId, pushToken);
    logger.info({ userId }, '[NotificationService] Unregistered push token');
  }

  async createNotification(params: CreateNotificationParams): Promise<Notification> {
    const {
      userId,
      vendorId,
      type,
      severity = 'INFO',
      title,
      body,
      data,
      channel = 'PUSH',
      dedupKey,
    } = params;

    // 1. Persist to PostgreSQL Inbox
    const createData: Prisma.NotificationCreateInput = {
      user: { connect: { id: userId } },
      ...(vendorId ? { vendor: { connect: { id: vendorId } } } : {}),
      type,
      severity,
      title,
      body,
      data: data ? (data as Prisma.InputJsonValue) : Prisma.JsonNull,
      channel,
      pushStatus: 'PENDING',
    };

    const notification = await this.repo.createNotification(createData);

    // 2. Dispatch push delivery job to BullMQ queue
    await this.queue.add(
      'push',
      {
        notificationId: notification.id,
        userId,
        type,
        severity,
        title,
        body,
        data,
      },
      {
        jobId: dedupKey || `notification:${notification.id}:${userId}`,
      },
    );

    return notification;
  }

  async notifyOrderStatus(params: OrderNotificationParams): Promise<Notification> {
    const { userId, orderId, orderNumber, status, trackingNumber, totalAmount, gateway } = params;

    const eventKey = status === 'OUT_FOR_DELIVERY' ? 'OUT_FOR_DELIVERY' : `ORDER_${status}`;
    const resolved = await resolveNotificationTemplate(
      eventKey,
      {
        orderNumber,
        trackingNumber,
        status,
        totalAmount,
        gateway,
      },
      this.settingsRepo,
    );

    return this.createNotification({
      userId,
      type: 'ORDER_STATUS',
      severity: resolved.severity,
      title: resolved.title,
      body: resolved.body,
      data: {
        orderId,
        orderNumber,
        status,
        url: `/orders/${orderId}`,
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(gateway ? { gateway } : {}),
      },
      dedupKey: `order:${orderId}:${status}`,
    });
  }

  async notifyNewOrderForAdminsAndVendors(params: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    vendorIds: string[];
  }): Promise<void> {
    const { orderId, orderNumber, totalAmount, vendorIds } = params;
    const adminIds = await this.repo.getAdminUserIds();

    for (const adminId of adminIds) {
      await this.createNotification({
        userId: adminId,
        type: 'SYSTEM',
        severity: 'INFO',
        title: 'New Order Received! 📦',
        body: `Order #${orderNumber} placed for NPR ${totalAmount.toLocaleString('en-IN')}.`,
        data: { orderId, orderNumber, url: `/orders/${orderId}` },
        dedupKey: `admin-order:${orderId}:${adminId}`,
      }).catch(() => {});
    }

    for (const vendorId of vendorIds) {
      if (!vendorId) continue;
      await this.createNotification({
        userId: adminIds[0] || '',
        vendorId,
        type: 'VENDOR_ORDER',
        severity: 'CRITICAL',
        title: 'New Order Received! 📦',
        body: `You have a new order #${orderNumber} for your store.`,
        data: { orderId, orderNumber, url: `/vendor/orders/${orderId}` },
        dedupKey: `vendor-order:${orderId}:${vendorId}`,
      }).catch(() => {});
    }
  }

  async getInbox(
    userId: string,
    query: GetInboxQueryInput,
    storeId?: string | null,
  ): Promise<PaginatedInboxResult> {
    return this.repo.getInbox({
      userId,
      storeId,
      ...query,
    });
  }

  async getUnreadCount(userId: string, storeId?: string | null): Promise<IUnreadCount> {
    return this.repo.getUnreadCount(userId, storeId);
  }

  async markAsRead(
    userId: string,
    notificationId: string,
    storeId?: string | null,
  ): Promise<Notification> {
    return this.repo.markAsRead(notificationId, userId, storeId);
  }

  async markAllAsRead(userId: string, storeId?: string | null): Promise<{ count: number }> {
    return this.repo.markAllAsRead(userId, storeId);
  }

  async getVendorNotificationsForAdmin(
    vendorId: string,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedInboxResult> {
    return this.repo.getVendorNotificationsForAdmin(vendorId, query);
  }

  async broadcast(
    adminUserId: string,
    input: BroadcastPayloadInput,
  ): Promise<{ dispatchedCount: number }> {
    const { title, body, targetAudience, deepLinkUrl } = input;

    logger.info(
      { adminUserId, targetAudience, title },
      '[NotificationService] Initiating mass broadcast dispatch',
    );

    // 1. Fetch audience tokens from PostgreSQL
    const audienceTokens = await this.repo.getAudiencePushTokens(targetAudience);
    if (audienceTokens.length === 0) {
      return { dispatchedCount: 0 };
    }

    const tokens = audienceTokens.map((t) => t.token);

    // 2. Atomic bulk enqueue in chunks of 100 via BullMQ addBulk
    const CHUNK_SIZE = 100;
    const bulkJobs = [];
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      bulkJobs.push({
        name: 'broadcast-chunk',
        data: {
          tokens: tokens.slice(i, i + CHUNK_SIZE),
          title,
          body,
          data: deepLinkUrl ? { url: deepLinkUrl } : undefined,
        },
      });
    }

    if (bulkJobs.length > 0) {
      await this.queue.addBulk(bulkJobs);
    }

    return { dispatchedCount: tokens.length };
  }
}

export const notificationService = new NotificationService();
