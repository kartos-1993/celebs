import { Queue } from 'bullmq';
import Redis from 'ioredis';

import { logger } from '@celebs/shared-utils';

import { config } from '@/config/app.config';

const redisHost = (config.REDIS.HOST || 'localhost')
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '');

const isTls =
  redisHost &&
  (redisHost.includes('upstash.io') ||
    config.NODE_ENV === 'production' ||
    config.NODE_ENV === 'staging');

/**
 * Single shared connection CONFIG for every BullMQ Queue/Worker in this
 * process (AGENTS.md §9 — one definition, fanned out, not per-instance
 * objects). BullMQ instantiates its own clients from it (including the
 * blocking duplicates), which keeps us on BullMQ's bundled ioredis copy —
 * passing a foreign ioredis client instance breaks both typing and BullMQ's
 * internal instanceof checks under pnpm's nested node_modules layout.
 * maxRetriesPerRequest: null is mandatory for BullMQ-managed connections.
 */
export const redisConnection = {
  host: redisHost,
  port: config.REDIS.PORT,
  password: config.REDIS.PASSWORD || undefined,
  ...(isTls ? { tls: {} } : {}),
  maxRetriesPerRequest: null,
};

/**
 * Idle poll interval for workers (seconds). BullMQ wakes immediately when a
 * real job lands (marker push), so a long drain only stretches the
 * empty-queue sleep — roughly 2 commands per queue per interval instead of
 * per 5s — with no added latency for real jobs. Staging queues sit empty most
 * of the time; keep this high to stay quiet on metered Redis (Upstash).
 */
export const WORKER_DRAIN_DELAY_SECONDS = 60;

export async function verifyRedisConnection(): Promise<void> {
  const client = new Redis({
    ...redisConnection,
    maxRetriesPerRequest: 1, // Fail fast for verification
  });

  const isDev = config.NODE_ENV === 'development';

  try {
    await client.ping();
    logger.info(
      { host: redisConnection.host, port: redisConnection.port },
      'Redis Connected successfully',
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (isDev) {
      logger.warn(
        {
          host: redisConnection.host,
          port: redisConnection.port,
          error: errorMsg,
        },
        'Redis Connection verification failed in development. Server will continue running but queues will fail.',
      );
      return;
    }
    logger.error(
      {
        host: redisConnection.host,
        port: redisConnection.port,
        error: error instanceof Error ? error.message : String(error),
      },
      'Redis Connection verification failed',
    );
    throw error;
  } finally {
    client.disconnect();
  }
}

export const assetQueue = new Queue('asset-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const sessionQueue = new Queue('session-maintenance', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Outbound transactional email delivery (processed by mail.worker).
// Retries harder than other queues — email providers rate-limit transiently.
export const mailQueue = new Queue('mail-delivery', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10_000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const orderMaintenanceQueue = new Queue('order-maintenance', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    assetQueue.close(),
    sessionQueue.close(),
    mailQueue.close(),
    orderMaintenanceQueue.close(),
  ]);
}
