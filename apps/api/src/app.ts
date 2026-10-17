import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { asyncHandler, ErrorCode, logger, NotFoundException } from '@celebs/shared-utils';

import { actorContext } from './common/context/actor-context.middleware';
import { requirePlatformActor } from './common/guards/store.guards';
import { isAllowedOrigin } from './common/http/origin.util';
import { generateOpenAPIDocument } from './common/openapi/openapi.config';
import { getBullBoardRouter } from './common/services/bull-board.service';
import { authenticateJWT } from './common/strategies/jwt.strategy';
import { config } from './config/app.config';
import { csrfOriginGuard } from './middlewares/csrf-origin-guard.middleware';
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
import devLogsRouter from './modules/dev/dev-logs.routes';
import commissionRoutes from './modules/finance/commission/commission.routes';
import earningsRoutes from './modules/finance/earnings/earnings.routes';
import financeRoutes from './modules/finance/finance.routes';
import sellerStatementRoutes from './modules/finance/ledger/seller-statement.routes';
import logisticsRoutes from './modules/logistics/logistics.routes';
import mediaRoutes from './modules/media/media.routes';
import notificationRoutes from './modules/notification/notification.routes';
import optionSetRoutes from './modules/option-set/option-set.routes';
import orderRoutes from './modules/order/order.routes';
import platformSettingsRoutes from './modules/platform-settings/platform-settings.routes';
import productRoutes from './modules/product/product.routes';
import renderRoutes from './modules/product/product-render.routes';
import quickFilterRoutes from './modules/quick-filter/quick-filter.routes';
import { reviewRoutes } from './modules/review/review.routes';
import sessionRoutes from './modules/session/session.routes';
import staffRoutes from './modules/staff/staff.routes';
import storefrontRoutes from './modules/storefront/storefront.routes';
import userRoutes from './modules/user/user.routes';
import vendorRoutes from './modules/vendor/vendor.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';

const app = express();
app.set('trust proxy', 1);
app.set('etag', false);
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

      if (isAllowedOrigin(origin, allowedOriginsList)) {
        return callback(null, true);
      }

      logger.warn({ origin, allowedOrigins: allowedOriginsList }, 'Origin blocked by CORS');
      return callback(null, false);
    },
    credentials: true,
    maxAge: 86400,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-session-id',
      'x-requested-with',
      'x-surface',
      'x-request-id',
      'x-refresh-token',
      'idempotency-key',
      'x-test-rate-limit',
      'Accept',
      'Origin',
      'If-None-Match',
      'If-Modified-Since',
    ],
    // Header names are case-insensitive (RFC 9110 §5.5) — single lowercase
    // entries cover all casings; no Title-Case duplicates.
    exposedHeaders: [
      'x-session-id',
      'x-request-id',
      'etag',
      'retry-after',
      'ratelimit-limit',
      'ratelimit-remaining',
      'ratelimit-reset',
    ],
  }),
);

app.use(cookieParser());
app.use(csrfOriginGuard);
app.use(passport.initialize());
app.use(
  pinoHttp({
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const isValid =
        typeof incoming === 'string' &&
        incoming.trim() !== '' &&
        /^[a-zA-Z0-9_-]{1,64}$/.test(incoming.trim());
      const id = isValid ? (incoming as string).trim() : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    logger,
    autoLogging: {
      ignore: (req) => {
        const url = req.url || '';
        return (
          url.includes('/health') ||
          url.includes('/favicon.ico') ||
          url.includes('/docs.json') ||
          url.includes('/admin/queues/static') ||
          url.includes('/dev/logs')
        );
      },
    },
    customLogLevel(req, res, err) {
      if (process.env.NODE_ENV === 'test') return 'silent';
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // Custom serializers to prevent logging massive objects and sensitive headers
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
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
      return `${req.method} ${req.url} -> ${res.statusCode} (${responseTime}ms)`;
    },
    customErrorMessage(req, res, error) {
      return `${req.method} ${req.url} -> ${res.statusCode}: ${error.message}`;
    },
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers.accept?.includes('text/event-stream') || req.path?.includes('/stream')) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);
app.use(globalRateLimiter);

// Fail fast rather than signing with an undefined secret. The identity layer
// is stateless JWT (`jwt.strategy.ts` verifies, `utils/jwt.ts` signs), so this
// guards token issuance - not a server-side session store.
if (!config.JWT.SECRET) {
  throw new Error('JWT_SECRET environment variable is required to issue and verify tokens');
}

app.use(`${config.BASE_PATH}/auth`, authRoutes);
app.use(`${config.BASE_PATH}/session`, sessionRoutes);
app.use(`${config.BASE_PATH}/categories`, categoryRoutes);
app.use(`${config.BASE_PATH}/category`, categoryRoutes);
app.use(`${config.BASE_PATH}/quick-filters`, quickFilterRoutes);
app.use(`${config.BASE_PATH}/quick-filter`, quickFilterRoutes); // Backward-compatibility alias
app.use(`${config.BASE_PATH}/option-sets`, optionSetRoutes);
app.use(`${config.BASE_PATH}/products`, productRoutes);
app.use(`${config.BASE_PATH}/brands`, brandRoutes);
app.use(`${config.BASE_PATH}/media`, mediaRoutes);
app.use(`${config.BASE_PATH}/vendors`, vendorRoutes);
app.use(`${config.BASE_PATH}/vendor`, vendorRoutes); // Backward-compatibility alias
const queuesPath = `${config.BASE_PATH}/admin/queues`;
if (config.NODE_ENV === 'development') {
  app.use(queuesPath, getBullBoardRouter());
} else {
  app.use(
    queuesPath,
    authenticateJWT,
    asyncHandler(actorContext),
    requirePlatformActor,
    getBullBoardRouter(),
  );
}

app.use(`${config.BASE_PATH}/admin`, adminRoutes);
app.use(`${config.BASE_PATH}/users`, userRoutes);
app.use(`${config.BASE_PATH}/staff`, staffRoutes);
app.use(`${config.BASE_PATH}/banners`, bannerRoutes);
app.use(`${config.BASE_PATH}/cart`, cartRoutes);
app.use(`${config.BASE_PATH}/orders`, orderRoutes);
app.use(`${config.BASE_PATH}/reviews`, reviewRoutes);
app.use(`${config.BASE_PATH}/notifications`, notificationRoutes);
app.use(`${config.BASE_PATH}/campaigns`, campaignRoutes);
app.use(`${config.BASE_PATH}/combos`, comboRoutes);
app.use(`${config.BASE_PATH}/logistics`, logisticsRoutes);
app.use(`${config.BASE_PATH}/finance/earnings`, earningsRoutes);
app.use(`${config.BASE_PATH}/finance`, financeRoutes);
app.use(`${config.BASE_PATH}/finance/commissions`, commissionRoutes);
app.use(`${config.BASE_PATH}/finance/statements`, sellerStatementRoutes);
app.use(`${config.BASE_PATH}/wishlist`, wishlistRoutes);
app.use(`${config.BASE_PATH}/settings`, platformSettingsRoutes);
app.use(`${config.BASE_PATH}/storefront`, storefrontRoutes);
app.use(`${config.BASE_PATH}`, renderRoutes);

if (config.NODE_ENV !== 'production') {
  app.get(`${config.BASE_PATH}/docs.json`, (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(generateOpenAPIDocument());
  });
  app.use(`${config.BASE_PATH}/docs`, swaggerUi.serve, swaggerUi.setup(generateOpenAPIDocument()));
  if (config.NODE_ENV === 'development') {
    app.use(`${config.BASE_PATH}/dev/logs`, devLogsRouter);
  } else {
    app.use(
      `${config.BASE_PATH}/dev/logs`,
      authenticateJWT,
      asyncHandler(actorContext),
      requirePlatformActor,
      devLogsRouter,
    );
  }
}

import healthRoutes from './modules/health/health.routes';

app.use('/health', healthRoutes);
app.use(`${config.BASE_PATH}/health`, healthRoutes);

// 404 Catch-All Handler (Guarantees JSON response for unhandled routes instead of Express default HTML)
app.use((req, _res, next) => {
  next(
    new NotFoundException(
      `Route ${req.method} ${req.originalUrl} not found`,
      ErrorCode.RESOURCE_NOT_FOUND,
    ),
  );
});

// Register error handler after all routes
app.use(errorHandler);

export default app;
