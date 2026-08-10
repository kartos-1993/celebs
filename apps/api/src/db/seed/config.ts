import path from 'path';
import dotenv from 'dotenv';
import prisma from '../../config/db.prisma';

const envPath =
  process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development');
dotenv.config({ path: envPath });

export async function connectDb(): Promise<typeof prisma> {
  console.log(`[Seed] Connecting to PostgreSQL database...`);
  await prisma.$connect();
  console.log(`[Seed] Connected to PostgreSQL database successfully.`);
  return prisma;
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  console.log(`[Seed] Disconnected from PostgreSQL database.`);
}
