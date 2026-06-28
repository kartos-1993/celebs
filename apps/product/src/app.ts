import express from 'express';
import { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/app.config';
import { errorHandler } from './middlewares/errorHandler';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { logger } from '@celebs/shared-utils';

// Import routes
import categoryRoutes from './modules/category/category.routes';
import optionSetRoutes from './modules/option-set/option-set.routes';
import renderRoutes from './modules/render/router';
import mediaRoutes from './modules/media/media.routes';
import productRoutes from './modules/product/product.routes';

const app = express();

// Basic middleware
app.use(json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
logger.info(
  { APP_ORIGIN_CONFIG: config.APP_ORIGIN },
  'CORS Origin Configuration',
);
app.use(
  cors({
    origin: config.APP_ORIGIN,
    credentials: true,
  }),
);

// Other middleware
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(compression());

if (config.NODE_ENV === 'production') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
} else {
  logger.info('Skipping global rate limiting in development/staging mode');
}

// API routes
app.use(`${config.BASE_PATH}/category`, categoryRoutes);
app.use(`${config.BASE_PATH}/option-sets`, optionSetRoutes);
app.use(`${config.BASE_PATH}/products`, productRoutes);
app.use(`${config.BASE_PATH}`, renderRoutes);
app.use(`${config.BASE_PATH}/media`, mediaRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Product service is healthy' });
});

// Global error handler
app.use(errorHandler);

export default app;
