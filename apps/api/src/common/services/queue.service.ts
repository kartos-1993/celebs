import { Queue } from 'bullmq';
import { config } from '@/config/app.config';

export const redisConnection = {
  host: config.REDIS.HOST,
  port: config.REDIS.PORT,
  password: config.REDIS.PASSWORD || undefined,
};

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
