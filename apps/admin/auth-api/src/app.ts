import express from 'express';
import { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from './middlewares/passport';
import { config } from './config/app.config';
import { errorHandler } from './middlewares/errorHandler';
import { HTTPSTATUS } from './config/http.config';
import { asyncHandler } from './middlewares/asyncHandler';
// import { authRouter } from './routes/auth.routes';
import authRoutes from './modules/auth/auth.routes';
import { authenticateJWT } from './common/strategies/jwt.strategy';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import pinoHttp from 'pino-http';
import { logger } from './common/utils/logger';

import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import sessionRoutes from './modules/session/session.routes';
// import { config } from './config';

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
app.use(pinoHttp({ logger }));
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

app.use(
  session({
    secret: config.JWT.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.NODE_ENV === 'production', // Only set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use(`${config.BASE_PATH}/auth`, authRoutes);
app.use(`${config.BASE_PATH}/session`, sessionRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Auth Service is healthy' });
});

// Register error handler after all routes
app.use(errorHandler);

export default app;
