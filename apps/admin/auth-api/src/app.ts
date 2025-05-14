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
// import { config } from './config';

const app = express();
app.use(json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = Array.isArray(config.APP_ORIGIN)
        ? config.APP_ORIGIN
        : [config.APP_ORIGIN];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
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
app.use(errorHandler);

// Redis client setup
// const redisClient = createClient({
//   username: config.redis.url,
//   legacyMode: true, // for connect-redis compatibility
// });
// redisClient.connect().catch(console.error);

// if (!config.sessionSecret) {
//   throw new Error(
//     'SESSION_SECRET (or JWT_SECRET) environment variable is required for session management'
//   );
// }

// app.use(
//   session({
//     store: new RedisStore({ client: redisClient }),
//     secret: config.sessionSecret,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: config.nodeEnv === 'production', // Only set to true if using HTTPS
//       httpOnly: true,
//       maxAge: 1000 * 60 * 60 * 24, // 1 day
//     },
//   })
// );

app.use(`${config.BASE_PATH}/auth`, authRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

export default app;
