import express from 'express';
import { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from './middlewares/passport';
import { config } from './config/app.config';
import { errorHandler } from './middlewares/errorHandler';
import { HTTPSTATUS, asyncHandler, logger } from '@celebs/shared-utils';

// import { authRouter } from './routes/auth.routes';
import authRoutes from './modules/auth/auth.routes';
import { authenticateJWT } from './common/strategies/jwt.strategy';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import pinoHttp from 'pino-http';


import session from 'express-session';
import sessionRoutes from './modules/session/session.routes';

import categoryRoutes from './modules/category/category.routes';
import optionSetRoutes from './modules/option-set/option-set.routes';
import productRoutes from './modules/product/product.routes';
import mediaRoutes from './modules/media/media.routes';
import renderRoutes from './modules/render/router';
import vendorRoutes from './modules/vendor/vendor.routes';
import adminRoutes from './modules/admin/admin.routes';
import staffRoutes from './modules/staff/staff.routes';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPIDocument } from './common/openapi/openapi.config';

const app = express();
app.use(json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

logger.info(
  { APP_ORIGIN_CONFIG: config.APP_ORIGIN },
  'CORS Origin Configuration'
);
app.use(
  cors({
    origin: config.APP_ORIGIN,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(passport.initialize());
app.use(
  pinoHttp({
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
  })
);
app.use(helmet());
app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.NODE_ENV === 'production' ? 100 : 1000, // limit based on environment
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Session management setup
if (!config.JWT.SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required for session management'
  );
}

let sessionStore;

if (config.REDIS.HOST && config.REDIS.PORT) {
  const isTls = config.REDIS.HOST.includes('upstash.io') || config.NODE_ENV === 'production' || config.NODE_ENV === 'staging';
  const protocol = isTls ? 'rediss' : 'redis';
  const credentials = config.REDIS.PASSWORD ? `default:${config.REDIS.PASSWORD}@` : '';
  const redisUrl = `${protocol}://${credentials}${config.REDIS.HOST}:${config.REDIS.PORT}`;

  const redisClient = createClient({ url: redisUrl });
  redisClient.connect()
    .then(() => logger.info('Redis connected successfully for sessions'))
    .catch((err) => logger.error({ err }, 'Redis connection failed'));

  sessionStore = new RedisStore({
    client: redisClient,
    prefix: 'celebs_sess:',
  });
} else {
  logger.warn('No Redis configuration found. Using in-memory session store (not recommended for production/staging)');
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
  })
);

app.use(`${config.BASE_PATH}/auth`, authRoutes);
app.use(`${config.BASE_PATH}/session`, sessionRoutes);
app.use(`${config.BASE_PATH}/category`, categoryRoutes);
app.use(`${config.BASE_PATH}/option-sets`, optionSetRoutes);
app.use(`${config.BASE_PATH}/products`, productRoutes);
app.use(`${config.BASE_PATH}/media`, mediaRoutes);
app.use(`${config.BASE_PATH}/vendor`, vendorRoutes);
app.use(`${config.BASE_PATH}/admin`, adminRoutes);
app.use(`${config.BASE_PATH}/staff`, staffRoutes);
app.use(`${config.BASE_PATH}`, renderRoutes);

if (config.NODE_ENV !== 'production') {
  app.use(
    `${config.BASE_PATH}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(generateOpenAPIDocument())
  );
}

app.get('/health', (req, res) => {
  res.status(HTTPSTATUS.OK).json({ status: 'OK', message: 'Auth Service is healthy', data: null });
});

// Register error handler after all routes
app.use(errorHandler);

export default app;
