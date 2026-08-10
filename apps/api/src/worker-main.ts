import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envName = process.env.NODE_ENV ?? 'development';
const envPath = path.resolve(process.cwd(), `apps/api/.env.${envName}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import prisma from './db';
import { logger } from '@celebs/shared-utils';
import { assetWorker } from './modules/media/asset.worker';
import { verifyRedisConnection } from './common/services/queue.service';
import { verifyS3Connection } from './common/utils/s3.client';

const startWorker = async () => {
  try {
    logger.info('Starting Background Worker Service...');

    await prisma.$connect();
    logger.info('PostgreSQL connection established successfully for Worker');

    // Connect and verify Redis and S3 connections for Worker
    await verifyRedisConnection();
    await verifyS3Connection();

    logger.info('BullMQ Worker is active and listening to queue: asset-processing');

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down worker gracefully...`);
      await assetWorker.close();
      await prisma.$disconnect();
      logger.info('Worker shutdown complete. Exiting.');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ error }, 'Failed to start Background Worker Service');
    process.exit(1);
  }
};

startWorker();
