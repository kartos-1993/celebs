// TODO: Deprecate - Migrating fully to Postgres
import mongoose from 'mongoose';
import { logger } from '@celebs/shared-utils';
import { config } from '@/config/app.config';

export const connectMongoDB = async () => {
  try {
    const uri = config.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not configured');
    }
    const conn = await mongoose.connect(uri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectMongoDB;
