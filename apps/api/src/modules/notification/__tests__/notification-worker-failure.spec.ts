import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

import type { NotificationJobPayload } from '../notification.worker';
import { recordPushJobFailure } from '../notification.worker';

/**
 * BullMQ does not await async 'failed' listeners, so anything thrown inside one
 * escapes as an unhandled promise rejection. The listener writes to a notification
 * row that may legitimately be gone by the time a job gives up on it, and a
 * throwing write there is what made the suite exit non-zero with every test green.
 */
const pushJob = (notificationId: string): Job => ({
  id: 'job-1',
  name: 'push',
  data: {
    notificationId,
    userId: 'user-1',
    title: 'Order shipped',
    body: 'Your parcel is on its way',
    severity: 'INFO',
    type: 'ORDER_STATUS',
  } satisfies NotificationJobPayload,
});

describe('recordPushJobFailure', () => {
  it('treats a notification row that no longer exists as already recorded', async () => {
    // updateMany reports zero rows matched rather than raising P2025, so a
    // deleted notification cannot escalate into an unhandled rejection.
    const notificationRepository = { markPushFailed: vi.fn(async () => undefined) };

    await expect(
      recordPushJobFailure(pushJob('gone-from-the-database'), new Error('push rejected'), {
        notificationRepository,
      }),
    ).resolves.toBeUndefined();

    expect(notificationRepository.markPushFailed).toHaveBeenCalledWith('gone-from-the-database');
  });

  it('does not reject when the status write itself fails', async () => {
    const notificationRepository = {
      markPushFailed: vi.fn(async () => {
        throw new Error('database is down');
      }),
    };

    await expect(
      recordPushJobFailure(pushJob('notification-1'), new Error('push rejected'), {
        notificationRepository,
      }),
    ).resolves.toBeUndefined();
  });

  it('does not reject when the fallback mail enqueue fails', async () => {
    const notificationRepository = { markPushFailed: vi.fn(async () => undefined) };
    const userRepository = {
      findUserById: vi.fn(async () => ({ email: 'buyer@example.com' })),
    };
    const mailQueue = {
      add: vi.fn(async () => {
        throw new Error('redis is down');
      }),
    };

    await expect(
      recordPushJobFailure(pushJob('notification-1'), new Error('push rejected'), {
        notificationRepository,
        userRepository,
        mailQueue,
      }),
    ).resolves.toBeUndefined();
  });

  it('ignores a failure event that carries no job', async () => {
    await expect(
      recordPushJobFailure(undefined, new Error('worker crashed')),
    ).resolves.toBeUndefined();
  });

  it('ignores a failure event for a job that is not a push', async () => {
    const notificationRepository = { markPushFailed: vi.fn(async () => undefined) };

    await recordPushJobFailure(
      { id: 'job-2', name: 'broadcast-chunk', data: {} } as Job,
      new Error('nope'),
      {
        notificationRepository,
      },
    );

    expect(notificationRepository.markPushFailed).not.toHaveBeenCalled();
  });

  it('still sends the fallback email for a critical push failure', async () => {
    const notificationRepository = { markPushFailed: vi.fn(async () => undefined) };
    const userRepository = {
      findUserById: vi.fn(async () => ({ email: 'buyer@example.com' })),
    };
    const mailQueue = { add: vi.fn(async () => undefined) };

    await recordPushJobFailure(pushJob('notification-1'), new Error('push rejected'), {
      notificationRepository,
      userRepository,
      mailQueue,
    });

    expect(mailQueue.add).toHaveBeenCalledOnce();
  });
});
