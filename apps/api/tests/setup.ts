// Import prisma so it gets configured with the test DB
import prisma from '@/db';

afterAll(async () => {
  // Close Prisma connection
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean all PostgreSQL tables
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';`;

  if (tablenames.length > 0) {
    for (const { tablename } of tablenames) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${tablename}";`);
      } catch (error) {
        // Ignored
      }
    }
  }
});
