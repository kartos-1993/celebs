import axios from 'axios';

import { logger } from '@celebs/shared-utils';

import { NotificationRepository, notificationRepository } from './notification.repository';
import type {
  ExpoPushResponse,
  OrderNotificationParams,
  PushNotificationPayload,
} from './notification.types';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export class NotificationService {
  constructor(private repo: NotificationRepository = notificationRepository) {}

  async registerToken(userId: string, token: string): Promise<void> {
    if (!token || !token.startsWith('ExponentPushToken[')) {
      logger.warn({ userId, token }, '[NotificationService] Invalid Expo push token format');
      return;
    }
    await this.repo.saveUserPushToken(userId, token);
    logger.info({ userId, token }, '[NotificationService] Registered push token');
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.repo.removeUserPushToken(userId, token);
    logger.info({ userId, token }, '[NotificationService] Unregistered push token');
  }

  async sendPushMessages(messages: PushNotificationPayload[]): Promise<void> {
    if (messages.length === 0) return;

    // Expo limits requests to 100 messages per batch
    const BATCH_SIZE = 100;
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        const res = await axios.post<ExpoPushResponse>(EXPO_PUSH_URL, batch, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        const invalidTokens: string[] = [];
        const tickets = res.data?.data || [];
        tickets.forEach((ticket, idx) => {
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const target = batch[idx]?.to;
            if (typeof target === 'string') {
              invalidTokens.push(target);
            }
          }
        });

        if (invalidTokens.length > 0) {
          logger.info(
            { count: invalidTokens.length },
            '[NotificationService] Cleaning inactive tokens',
          );
          await this.repo.removeInvalidTokens(invalidTokens);
        }
      } catch (err) {
        logger.error(
          { err },
          '[NotificationService] Failed to dispatch Expo push notification batch',
        );
      }
    }
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const tokens = await this.repo.getUserPushTokens(userId);
    if (tokens.length === 0) return;

    const messages: PushNotificationPayload[] = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'order-updates',
    }));

    await this.sendPushMessages(messages);
  }

  async sendToAll(title: string, body: string, data?: Record<string, unknown>): Promise<number> {
    const tokens = await this.repo.getAllPushTokens();
    if (tokens.length === 0) return 0;

    const messages: PushNotificationPayload[] = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      priority: 'normal',
      channelId: 'promotions',
    }));

    await this.sendPushMessages(messages);
    return tokens.length;
  }

  async notifyOrderStatus(params: OrderNotificationParams): Promise<void> {
    const { userId, orderId, orderNumber, status, trackingNumber } = params;

    let title = `Order Update #${orderNumber}`;
    let body = `Your order status changed to ${status}.`;

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
        break;
      case 'DELIVERED':
        title = 'Package Delivered! 🎉';
        body = `Your order #${orderNumber} has arrived. Tap here to leave a review!`;
        break;
      case 'CANCELLED':
        title = 'Order Cancelled';
        body = `Your order #${orderNumber} was cancelled.`;
        break;
    }

    await this.sendToUser(userId, title, body, {
      type: 'ORDER_STATUS_UPDATE',
      orderId,
      status,
      url: `/order-detail?id=${orderId}`,
    });
  }
}

export const notificationService = new NotificationService();
