import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file at the very beginning
const envPath = path.resolve(
  process.cwd(),
  'apps/admin/product/.env.development'
);
dotenv.config({ path: envPath });

import app from './app';
import { config } from './config/app.config';
import connectDB from './db';
import { logger } from './common/utils/logger';

// Connect to MongoDB
connectDB().then(() => {
  const port = config.PORT;
  const server = app.listen(port, () => {
    logger.info(`Product service listening at http://localhost:${port}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
  });
  
  server.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
});