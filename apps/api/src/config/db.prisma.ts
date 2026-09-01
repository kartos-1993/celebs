import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { logger } from '@celebs/shared-utils';

export { Prisma };

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.warn('DATABASE_URL environment variable is not defined.');
}

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: AppPrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const isDev = process.env.NODE_ENV === 'development';
const slowQueryThresholdMs = Number(process.env.SLOW_QUERY_THRESHOLD_MS ?? '500');

// Pool configurations optimized for Supabase PgBouncer (Port 6543)
const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 4 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

const adapter = new PrismaPg(pool);

function createPrismaClient() {
  return new PrismaClient({
    adapter,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });
}

export const prisma: AppPrismaClient = globalThis.__prismaClient ?? createPrismaClient();

if (isDev) {
  globalThis.__prismaClient = prisma;
  globalThis.__pgPool = pool;
}

if (!isDev) {
  prisma.$on('query', (event) => {
    if (event.duration >= slowQueryThresholdMs) {
      logger.warn(
        { durationMs: event.duration, query: event.query },
        'Slow database query detected',
      );
    }
  });
  prisma.$on('warn', (event) => {
    logger.warn({ message: event.message }, 'Prisma warning');
  });
  prisma.$on('error', (event) => {
    logger.error({ message: event.message }, 'Prisma error');
  });
} else {
  prisma.$on('query', (event) => {
    logger.debug({ durationMs: event.duration, query: event.query }, 'db query');
  });
}

export default prisma;
