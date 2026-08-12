import { Queue } from 'bullmq';
import Redis from 'ioredis';

import { logger } from '@celebs/shared-utils';

import { config } from '@/config/app.config';

const isTls =
  config.REDIS.HOST &&
  (config.REDIS.HOST.includes('upstash.io') ||
    config.NODE_ENV === 'production' ||
    config.NODE_ENV === 'staging');

export const redisConnection = {
  host: config.REDIS.HOST,
  port: config.REDIS.PORT,
  password: config.REDIS.PASSWORD || undefined,
  ...(isTls ? { tls: {} } : {}),
};

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
