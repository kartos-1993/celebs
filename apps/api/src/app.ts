import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { json } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { logger } from '@celebs/shared-utils';

import { generateOpenAPIDocument } from './common/openapi/openapi.config';
import { config } from './config/app.config';
import { UpstashRedisStore } from './config/session-store';
import { errorHandler } from './middlewares/error-handler';
import passport from './middlewares/passport';
import { globalRateLimiter } from './middlewares/rate-limiter.middleware';
import adminRoutes from './modules/admin/admin.routes';
// import { authRouter } from './routes/auth.routes';
import authRoutes from './modules/auth/auth.routes';
import bannerRoutes from './modules/banner/banner.routes';
import brandRoutes from './modules/brand/brand.routes';
import campaignRoutes from './modules/campaign/campaign.routes';
import cartRoutes from './modules/cart/cart.routes';
import categoryRoutes from './modules/category/category.routes';
import comboRoutes from './modules/combo/combo.routes';
import logisticsRoutes from './modules/logistics/logistics.routes';
import mediaRoutes from './modules/media/media.routes';
import optionSetRoutes from './modules/option-set/option-set.routes';
import orderRoutes from './modules/order/order.routes';
import platformSettingsRoutes from './modules/platform-settings/platform-settings.routes';
import productRoutes from './modules/product/product.routes';
import renderRoutes from './modules/product/product-render.routes';
import quickFilterRoutes from './modules/quick-filter/quick-filter.routes';
import sessionRoutes from './modules/session/session.routes';
import staffRoutes from './modules/staff/staff.routes';
import vendorRoutes from './modules/vendor/vendor.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';

const app = express();
app.set('trust proxy', 1);
app.use(json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

logger.info({ APP_ORIGIN_CONFIG: config.APP_ORIGIN }, 'CORS Origin Configuration');

const allowedOriginsList = Array.isArray(config.APP_ORIGIN)
  ? config.APP_ORIGIN
  : [config.APP_ORIGIN];

app.use(
  cors({
    origin: (origin, callback) => {
      // Native mobile clients (Expo / React Native via iOS NSURLSession & Android OkHttp)
      // and server-to-server calls do not issue browser Origin headers. They are explicitly
      // permitted here; security is enforced via JWT Bearer tokens and refresh rotation.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOriginsList.includes(origin)) {
        return callback(null, true);
      }

      // In development, permit localhost, 127.0.0.1, and private LAN IP ranges
      if (config.NODE_ENV === 'development') {
        const isLocalDev =
          /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
            origin,
          );
        if (isLocalDev) {
          return callback(null, true);
        }
      }

      logger.warn({ origin, allowedOrigins: allowedOriginsList }, 'Origin blocked by CORS');
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-session-id',
      'X-Session-Id',
      'x-requested-with',
      'X-Requested-With',
      'x-surface',
      'X-Surface',
      'x-request-id',
      'X-Request-Id',
      'x-refresh-token',
      'X-Refresh-Token',
      'idempotency-key',
      'Idempotency-Key',
      'x-test-rate-limit',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['x-session-id', 'X-Session-Id', 'x-request-id', 'X-Request-Id'],
  }),
);

app.use(cookieParser());
app.use(passport.initialize());
app.use(
  pinoHttp({
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id = typeof incoming === 'string' && incoming.trim() !== '' ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    logger,
    // Silence request logging in test environment to keep test runs clean
    useLevel: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    // Custom serializers to prevent logging massive objects and sensitive headers
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
    // Concise request completion messages
    customSuccessMessage(req, res, responseTime) {
      return `${req.method} ${req.url} completed with status ${res.statusCode} in ${responseTime}ms`;
    },
    customErrorMessage(req, res, error) {
      return `${req.method} ${req.url} failed with status ${res.statusCode}: ${error.message}`;
    },
  }),
);
app.use(helmet());
app.use(compression());
app.use(globalRateLimiter);

// Session management setup
if (!config.JWT.SECRET) {
  throw new Error('JWT_SECRET environment variable is required for session management');
}

let sessionStore;

// Any reachable Redis host qualifies (local Memurai/Docker runs passwordless)
if (config.REDIS.HOST) {
  sessionStore = new UpstashRedisStore('celebs_sess:', 86400);
} else {
  logger.warn(
    'No Redis configuration found. Using in-memory session store (not recommended for production/staging)',
  );
}

app.use(
  session({
    store: sessionStore,
    secret: config.JWT.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.COOKIE.SECURE,
      httpOnly: config.COOKIE.HTTPONLY,
      sameSite: config.COOKIE.SAME_SITE,
      domain: config.COOKIE.DOMAIN || undefined,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }),
);

app.use(`${config.BASE_PATH}/auth`, authRoutes);
app.use(`${config.BASE_PATH}/session`, sessionRoutes);
app.use(`${config.BASE_PATH}/categories`, categoryRoutes);
app.use(`${config.BASE_PATH}/category`, categoryRoutes);
app.use(`${config.BASE_PATH}/quick-filter`, quickFilterRoutes);
app.use(`${config.BASE_PATH}/option-sets`, optionSetRoutes);
app.use(`${config.BASE_PATH}/products`, productRoutes);
app.use(`${config.BASE_PATH}/brands`, brandRoutes);
app.use(`${config.BASE_PATH}/media`, mediaRoutes);
app.use(`${config.BASE_PATH}/vendor`, vendorRoutes);
app.use(`${config.BASE_PATH}/admin`, adminRoutes);
app.use(`${config.BASE_PATH}/staff`, staffRoutes);
app.use(`${config.BASE_PATH}/banners`, bannerRoutes);
app.use(`${config.BASE_PATH}/cart`, cartRoutes);
app.use(`${config.BASE_PATH}/orders`, orderRoutes);
app.use(`${config.BASE_PATH}/campaigns`, campaignRoutes);
app.use(`${config.BASE_PATH}/combos`, comboRoutes);
app.use(`${config.BASE_PATH}/logistics`, logisticsRoutes);
app.use(`${config.BASE_PATH}/wishlist`, wishlistRoutes);
app.use(`${config.BASE_PATH}/settings`, platformSettingsRoutes);
app.use(`${config.BASE_PATH}`, renderRoutes);

if (config.NODE_ENV !== 'production') {
  app.use(`${config.BASE_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(generateOpenAPIDocument()));
}

import healthRoutes from './modules/health/health.routes';

app.use('/health', healthRoutes);
app.use(`${config.BASE_PATH}/health`, healthRoutes);

// Register error handler after all routes
app.use(errorHandler);

export default app;
