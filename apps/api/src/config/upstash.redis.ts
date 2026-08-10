import { Redis } from '@upstash/redis';
import { config } from './app.config';

const host = config.REDIS.HOST || 'localhost';
const password = config.REDIS.PASSWORD || 'mock-token';

const rawHost = host.trim().replace(/^https?:\/\//, '');
const restUrl = `https://${rawHost}`;

export const upstashRedis = new Redis({
  url: restUrl,
  token: password,
});
