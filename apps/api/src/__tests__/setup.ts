import { execSync } from 'child_process';
import mongoose from 'mongoose';

// Set up env variables before anything else imports them
process.env.DATABASE_URL = 'postgresql://postgres:celebs@localhost:5432/celebs-test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/celebs-product-test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_long_enough_for_hmac';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_long_enough_for_hmac';

// Import prisma so it gets configured with the test DB
import prisma from '../db';

beforeAll(async () => {
  // Push the Prisma schema to the test database to ensure it is up-to-date
  try {
    execSync('npx prisma db push --schema=apps/api/src/db/schema.prisma --accept-data-loss', {
      stdio: 'ignore',
    });
  } catch (error) {
    console.error('Failed to push prisma schema to test database:', error);
  }

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

  for (const { tablename } of tablenames) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${tablename}" CASCADE;`
      );
    } catch (error) {
      // Ignored
    }
  }

  // Clean MongoDB collections
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});
