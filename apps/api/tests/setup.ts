import { afterAll, beforeEach } from 'vitest';

import prisma from '@/config/db.prisma';

// TRUNCATE ... CASCADE across every public table contends for the single local test database and
// can exceed vitest's default 10s hookTimeout under parallel load, failing suites for reasons that
// have nothing to do with the code under test. Raise the timeout for this hook only.
const TRUNCATE_HOOK_TIMEOUT_MS = 120_000;

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  try {
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
    `;

    if (tablenames.length > 0) {
      const names = tablenames.map((t) => `"${t.tablename}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE;`);
    }
  } catch {
    // Fallback if test DB connection is not available in isolated unit runs
  }
}, TRUNCATE_HOOK_TIMEOUT_MS);
