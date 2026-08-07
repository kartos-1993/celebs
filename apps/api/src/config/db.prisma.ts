import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '@celebs/shared-utils';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; pgPool: Pool };

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.warn('DATABASE_URL environment variable is not defined.');
}

// Pool configurations optimized for Supabase PgBouncer (Port 6543)
const pool =
  globalForPrisma.pgPool ||
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 4 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

export default prisma;
