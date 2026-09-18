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

import type { PaginatedInboxResult } from './notification.repository';
import { NotificationRepository, notificationRepository } from './notification.repository';
import type { OrderNotificationParams } from './notification.types';

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
    const { userId, orderId, orderNumber, status, trackingNumber } = params;

    let title = `Order Update #${orderNumber}`;
    let body = `Your order status changed to ${status}.`;
    let severity: NotificationSeverity = 'INFO';

    switch (status) {
      case 'CONFIRMED':
        title = 'Order Confirmed 🛍️';
        body = `Your order #${orderNumber} has been confirmed and is being processed.`;
        break;
      case 'SHIPPED':
        title = 'Order Shipped ✈️';
        body = trackingNumber
          ? `Your order #${orderNumber} is on the way! Tracking: ${trackingNumber}`
          : `Your order #${orderNumber} is on its way to you!`;
        break;
      case 'OUT_FOR_DELIVERY':
        title = 'Out for Delivery 🚚';
        body = `Your package for #${orderNumber} is out for delivery today!`;
        severity = 'CRITICAL';
        break;
      case 'DELIVERED':
        title = 'Package Delivered! 🎉';
        body = `Your order #${orderNumber} has arrived. Tap here to leave a review!`;
        break;
      case 'CANCELLED':
        title = 'Order Cancelled';
        body = `Your order #${orderNumber} was cancelled.`;
        severity = 'CRITICAL';
        break;
    }

    return this.createNotification({
      userId,
      type: 'ORDER_STATUS',
      severity,
      title,
      body,
      data: {
        orderId,
        orderNumber,
        status,
        url: `/orders/${orderId}`,
      },
      dedupKey: `order:${orderId}:${status}`,
    });
  }

  async getInbox(userId: string, query: GetInboxQueryInput): Promise<PaginatedInboxResult> {
    return this.repo.getInbox({
      userId,
      ...query,
    });
  }

  async getUnreadCount(userId: string): Promise<IUnreadCount> {
    return this.repo.getUnreadCount(userId);
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    return this.repo.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.repo.markAllAsRead(userId);
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
