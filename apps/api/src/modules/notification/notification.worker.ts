import type { Job } from 'bullmq';
import { Queue, Worker } from 'bullmq';

import type { NotificationSeverity, NotificationType, PushStatus } from '@celebs/shared-types';
import { logger } from '@celebs/shared-utils';

import { ExpoPushService, expoPushService } from './expo-push.service';
import { NotificationRepository, notificationRepository } from './notification.repository';
import { calculateQuietHoursDelay, shouldApplyQuietHours } from './notification-quiet-hours.util';

import {
  mailQueue,
  redisConnection,
  WORKER_DRAIN_DELAY_SECONDS,
} from '@/common/services/queue.service';
import type { UserRepository } from '@/modules/user/user.repository';
import { userRepository } from '@/modules/user/user.repository';

export interface NotificationJobPayload {
  notificationId: string;
  userId: string;
  tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  severity: NotificationSeverity;
  type: NotificationType;
  channelId?: string;
}

export interface BroadcastChunkJobPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}

export interface ProcessJobResult {
  delivered?: boolean;
  skipped?: boolean;
  fallbackToMail?: boolean;
  delayed?: boolean;
  delayMs?: number;
  reason?: string;
}

export async function processNotificationJob(
  payload: NotificationJobPayload,
  repo: NotificationRepository = notificationRepository,
  pushService: ExpoPushService = expoPushService,
  outboundMailQueue: Queue = mailQueue,
  userRepo: UserRepository = userRepository,
): Promise<ProcessJobResult> {
  const { notificationId, userId, type, severity, title, body, data, channelId } = payload;

  // 1. Fetch user preferences & email
  const user = await userRepo.findUserWithPreferences(userId);

  if (!user) {
    logger.warn({ userId, notificationId }, 'Notification recipient user not found');
    await repo.updatePushStatus(notificationId, 'FAILED');
    return { skipped: true, reason: 'USER_NOT_FOUND' };
  }

  // 2. Granular Notification Preference Check
  const prefs = user.userPreferences;
  if (prefs) {
    if (type === 'ORDER_STATUS' && !prefs.pushOrderUpdates) {
      await repo.updatePushStatus(notificationId, 'SKIPPED');
      return { skipped: true, reason: 'PREFERENCE_DISABLED' };
    }
    if ((type === 'BROADCAST' || type === 'CART_ABANDONED') && !prefs.pushPromotions) {
      await repo.updatePushStatus(notificationId, 'SKIPPED');
      return { skipped: true, reason: 'PREFERENCE_DISABLED' };
    }
    if (type === 'PRICE_DROP' && !prefs.pushPriceDrops) {
      await repo.updatePushStatus(notificationId, 'SKIPPED');
      return { skipped: true, reason: 'PREFERENCE_DISABLED' };
    }
  }

  // 3. Resolve Push Tokens directly from PostgreSQL (Single Source of Truth)
  const tokens =
    payload.tokens && payload.tokens.length > 0
      ? payload.tokens
      : await repo.getUserPushTokens(userId);

  // 4. Fallback to mailQueue if no tokens available for critical notifications
  if (tokens.length === 0) {
    const isCritical = severity === 'CRITICAL' || type === 'ORDER_STATUS' || type === 'PAYMENT';
    if (isCritical && user.email) {
      await outboundMailQueue.add(
        'send',
        {
          to: user.email,
          subject: title,
          text: body,
          html: `<p>${body}</p>`,
        },
        { attempts: 3 },
      );
      await repo.updatePushStatus(notificationId, 'SKIPPED');
      return { skipped: true, fallbackToMail: true };
    }

    await repo.updatePushStatus(notificationId, 'SKIPPED');
    return { skipped: true, fallbackToMail: false, reason: 'NO_TOKENS' };
  }

  // 5. Quiet Hours Evaluation (Nepal Time NPT UTC+5:45)
  if (shouldApplyQuietHours(type, severity)) {
    const { inQuietHours, delayMs } = calculateQuietHoursDelay();
    if (inQuietHours && delayMs > 0) {
      logger.info(
        { notificationId, userId, delayMs },
        'Notification deferred due to Nepal quiet hours',
      );
      return { delayed: true, delayMs };
    }
  }

  // 6. Dispatch push messages to Expo Push API
  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
    channelId: channelId || (severity === 'CRITICAL' ? 'urgent' : 'orders'),
  }));

  const tickets = await pushService.sendPushNotifications(messages);

  // 7. Prune stale / unregistered tokens synchronously from tickets
  const invalidTokens = pushService.extractInvalidTokens(tickets, tokens);
  if (invalidTokens.length > 0) {
    await repo.deleteInvalidPushTokens(invalidTokens);
    logger.info({ count: invalidTokens.length }, 'Pruned unregistered push tokens from PostgreSQL');
  }

  const pushStatus: PushStatus = 'SENT';
  await repo.updatePushStatus(notificationId, pushStatus);
  return { delivered: true };
}

export const notificationWorker = new Worker(
  'notification-delivery',
  async (job: Job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing notification job');

    if (job.name === 'push') {
      const result = await processNotificationJob(job.data as NotificationJobPayload);
      if (result.delayed && result.delayMs) {
        await job.moveToDelayed(Date.now() + result.delayMs, job.token);
      }
      return result;
    }

    if (job.name === 'broadcast-chunk') {
      const payload = job.data as BroadcastChunkJobPayload;
      const messages = payload.tokens.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        channelId: payload.channelId || 'promotions',
      }));

      const tickets = await expoPushService.sendPushNotifications(messages);
      const invalidTokens = expoPushService.extractInvalidTokens(tickets, payload.tokens);
      if (invalidTokens.length > 0) {
        await notificationRepository.deleteInvalidPushTokens(invalidTokens);
      }
      return { delivered: true, count: payload.tokens.length };
    }

    return { ignored: true };
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000, // 600 notifications / min rate limiter
    },
    drainDelay: WORKER_DRAIN_DELAY_SECONDS,
  },
);

notificationWorker.on('failed', async (job, error) => {
  try {
    logger.error(
      { jobId: job?.id, error: error.message, attempts: job?.attemptsMade },
      'Notification job ultimately failed',
    );

    if (job?.name === 'push') {
      const data = job.data as NotificationJobPayload;
      if (data?.notificationId) {
        await notificationRepository.updatePushStatus(data.notificationId, 'FAILED');
      }

      // Ultimate fallback for critical notifications
      if (data?.severity === 'CRITICAL' || data?.type === 'ORDER_STATUS') {
        const user = await userRepository.findUserById(data.userId);
        if (user?.email) {
          await mailQueue.add(
            'send',
            {
              to: user.email,
              subject: data.title,
              text: data.body,
              html: `<p>${data.body}</p>`,
            },
            { attempts: 3 },
          );
        }
      }
    }
  } catch (err) {
    logger.error(
      { err, jobId: job?.id },
      'Failed to execute notificationWorker failed-event callback',
    );
  }
});
