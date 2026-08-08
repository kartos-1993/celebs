import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import prisma from '../../config/db.prisma';
import { connectMongoDB } from '../../config/db.mongo';

const envPath = process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development');
dotenv.config({ path: envPath });

export async function connectDb(): Promise<typeof prisma> {
  console.log(`[Seed] Connecting to PostgreSQL database...`);
  await prisma.$connect();
  console.log(`[Seed] Connected to PostgreSQL database successfully.`);

  console.log(`[Seed] Connecting to MongoDB database...`);
  await connectMongoDB();
  console.log(`[Seed] Connected to MongoDB database successfully.`);

  return prisma;
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  console.log(`[Seed] Disconnected from PostgreSQL & MongoDB databases.`);
}
