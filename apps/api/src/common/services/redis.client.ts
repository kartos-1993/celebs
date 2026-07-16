import Redis from 'ioredis';
import { config } from '@/config/app.config';

export const redisClient = new Redis({
  host: config.REDIS.HOST,
  port: config.REDIS.PORT,
  password: config.REDIS.PASSWORD,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});
