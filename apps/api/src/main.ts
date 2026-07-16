import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envName = process.env.NODE_ENV ?? 'development';
const envPath = path.resolve(process.cwd(), `apps/api/.env.${envName}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import app from './app';
import { config } from './config/app.config';
import { connectMongoDB } from './db/mongodb';
import prisma from './db';
import { logger } from '@celebs/shared-utils';
import { verifyRedisConnection } from './common/services/queue.service';
import { verifyS3Connection } from './common/utils/s3.client';

const port = config.PORT;

const startServer = async () => {
  try {
    await connectMongoDB();
    
    // Connect and verify Postgres connection
    await prisma.$connect();
    logger.info('Postgres Database Connected successfully');

    // Connect and verify Redis and S3 connections
    await verifyRedisConnection();
    await verifyS3Connection();

    const server = app.listen(port, () => {
      console.log(`Listening at http://localhost:${port}`);
    });
    server.on('error', console.error);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
