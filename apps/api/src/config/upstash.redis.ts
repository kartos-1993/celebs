import { Redis } from '@upstash/redis';
import { config } from './app.config';

if (!config.REDIS.HOST || !config.REDIS.PASSWORD) {
  throw new Error('Critical Configuration Fault: Missing authorization credentials for Upstash Redis REST endpoints.');
}

// Strip leading https:// or http:// protocols if present to prevent double URL protocol errors
const rawHost = config.REDIS.HOST.trim().replace(/^https?:\/\//, '');
const restUrl = `https://${rawHost}`;

export const upstashRedis = new Redis({
  url: restUrl,
  token: config.REDIS.PASSWORD,
});
