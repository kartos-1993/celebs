import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envName = process.env.NODE_ENV ?? 'development';
const localEnvPath = path.resolve(process.cwd(), `.env.${envName}`);
const monorepoEnvPath = path.resolve(process.cwd(), `apps/api/.env.${envName}`);
const envPath = fs.existsSync(localEnvPath) ? localEnvPath : monorepoEnvPath;

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { logger } from '@celebs/shared-utils';

import { verifyRedisConnection } from './common/services/queue.service';
import { verifyS3Connection } from './common/utils/s3.client';
import { config } from './config/app.config';
import prisma from './config/db.prisma';
import { captureSentryException, closeSentry, initSentry } from './config/sentry';
import app from './app';

initSentry();

const port = config.PORT;

let currentServer: ReturnType<typeof app.listen> | null = null;
let selfPingTimer: NodeJS.Timeout | null = null;

logger.info(
  {
    nodeEnv: config.NODE_ENV,
    version: process.env.RENDER_GIT_COMMIT ?? 'local',
    sentry: process.env.SENTRY_DSN ? 'enabled' : 'disabled',
  },
  'API starting',
);

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
    currentServer = server;
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

  selfPingTimer = setInterval(async () => {
    try {
      const response = await fetch(pingUrl);
      logger.info(`Self-ping status: ${response.status} ${response.statusText}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err: errMsg }, 'Self-ping failed');
    }
  }, intervalMs);
};

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal, draining gracefully');
  if (selfPingTimer) clearInterval(selfPingTimer);
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000).unref();

  try {
    await new Promise<void>((resolve) => {
      if (!currentServer) return resolve();
      currentServer.close(() => resolve());
    });
    await prisma.$disconnect();
    await closeSentry();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
  captureSentryException(reason);
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception, exiting');
  captureSentryException(err);
  process.exit(1);
});

startServer().catch((error: unknown) => {
  logger.error({ error }, 'Unhandled server startup rejection');
  process.exit(1);
});
