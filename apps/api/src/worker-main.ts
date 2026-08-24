import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envName = process.env.NODE_ENV ?? 'development';
const envPath = path.resolve(process.cwd(), `apps/api/.env.${envName}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { logger } from '@celebs/shared-utils';

import { assetQueue, sessionQueue, verifyRedisConnection } from './common/services/queue.service';
import { verifyS3Connection } from './common/utils/s3.client';
import prisma from './config/db.prisma';
import { assetWorker } from './modules/media/asset.worker';
import { sessionWorker } from './modules/session/session.worker';

const startWorker = async () => {
  try {
    logger.info('Starting Background Worker Service...');

    await prisma.$connect();
    logger.info('PostgreSQL connection established successfully for Worker');

    // Connect and verify Redis and S3 connections for Worker
    await verifyRedisConnection();
    await verifyS3Connection();

    logger.info('BullMQ Worker is active and listening to queues: asset-processing, mail-delivery, session-maintenance');

    // Register daily repeatable session maintenance job (runs at midnight 00:00)
    await sessionQueue.add(
      'purge-expired-sessions',
      {},
      {
        repeat: {
          pattern: '0 0 * * *',
        },
        jobId: 'daily-expired-session-purge',
      },
    );
    logger.info('Scheduled daily session maintenance job (pattern: 0 0 * * *)');

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down worker gracefully...`);
      await assetWorker.close();
      await sessionWorker.close();
      await assetQueue.close();
      await sessionQueue.close();
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
