import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envName = process.env.NODE_ENV ?? 'development';
const envPath = path.resolve(process.cwd(), `apps/api/.env.${envName}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import app from './app';
import { config } from './config/app.config';
import prisma from './config/db.prisma';
import { logger } from '@celebs/shared-utils';
import { verifyRedisConnection } from './common/services/queue.service';
import { verifyS3Connection } from './common/utils/s3.client';

const port = config.PORT;

const startServer = async () => {
  try {
    // Connect and verify Postgres connection
    await prisma.$connect();
    logger.info('Postgres Database Connected successfully');

    // Connect and verify Redis and S3 connections
    await verifyRedisConnection();
    await verifyS3Connection();

    const server = app.listen(port, () => {
      console.log(`Listening at http://localhost:${port}`);
      startSelfPing();
    });
    server.on('error', console.error);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const startSelfPing = () => {
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (!externalUrl) {
    logger.info('RENDER_EXTERNAL_URL is not set. Self-pinging is disabled.');
    return;
  }

  // Ping every 14 minutes (840,000 ms) to keep the instance from sleeping
  const intervalMs = 14 * 60 * 1000;
  const pingUrl = `${externalUrl.replace(/\/$/, '')}/health`;

  logger.info(`Starting self-ping service targeting: ${pingUrl} (every 14 minutes)`);

  setInterval(async () => {
    try {
      const response = await fetch(pingUrl);
      logger.info(`Self-ping status: ${response.status} ${response.statusText}`);
    } catch (err: any) {
      logger.error({ err: err?.message || String(err) }, 'Self-ping failed');
    }
  }, intervalMs);
};

startServer();
