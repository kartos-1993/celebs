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

const app = express();
app.use(json());

const logger = pino();
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Redis client setup
const redisClient = createClient({
  url: 'redis://localhost:6379',
  legacyMode: true, // for connect-redis compatibility
});
redisClient.connect().catch(console.error);

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true if using HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

app.use('/api/auth', authRouter);

export default app;
