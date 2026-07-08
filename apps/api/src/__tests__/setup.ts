import mongoose from 'mongoose';

// Import prisma so it gets configured with the test DB
import prisma from '@/db';

beforeAll(async () => {
  // Connect Mongoose to the test Mongo database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
});

afterAll(async () => {
  // Close Prisma connection
  await prisma.$disconnect();

  // Close MongoDB/Mongoose connection
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Clean all PostgreSQL tables
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';`;

  if (tablenames.length > 0) {
    const formattedTables = tablenames
      .map(({ tablename }) => `"${tablename}"`)
      .join(', ');
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${formattedTables} CASCADE;`
      );
    } catch (error) {
      // Ignored
    }
  }

  // Clean MongoDB collections
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(
      collections.map((collection) => collection.deleteMany({}))
    );
  }
});
