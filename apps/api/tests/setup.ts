import { afterAll, beforeEach } from 'vitest';

import prisma from '@/config/db.prisma';

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
});
