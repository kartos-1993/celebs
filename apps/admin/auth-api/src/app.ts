import express from 'express';
import { json } from 'express';
import { authRouter } from './routes/auth.routes';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { config } from './config';

const app = express();
app.use(json());

const logger = pino();
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.nodeEnv === 'production' ? 100 : 1000, // limit based on environment
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Redis client setup
const redisClient = createClient({
  username: config.redis.url,
  legacyMode: true, // for connect-redis compatibility
});
redisClient.connect().catch(console.error);

if (!config.sessionSecret) {
  throw new Error(
    'SESSION_SECRET (or JWT_SECRET) environment variable is required for session management'
  );
}

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.nodeEnv === 'production', // Only set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

const router = express.Router();
app.use('/api/auth', authRouter);

app.get('/health', (req, res) => {
  res.send(200).json({ status: 'OK', message: 'Server is healthy' });
});

export default app;
