import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from apps/api/.env.development by default
const envPath = process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development');
dotenv.config({ path: envPath });

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      `[Seed Error] MONGODB_URI environment variable is missing!\n` +
      `Please ensure MONGODB_URI is properly configured in '${envPath}'.`
    );
  }
  return uri;
}

export async function connectDb(): Promise<typeof mongoose> {
  const uri = getMongoUri();
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  console.log(`[Seed] Connecting to MongoDB Atlas cluster...`);
  const conn = await mongoose.connect(uri);
  console.log(`[Seed] Connected to MongoDB database: ${conn.connection.name}`);
  return conn;
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log(`[Seed] Disconnected from MongoDB.`);
  }
}
