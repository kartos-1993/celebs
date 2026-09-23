import Redis from 'ioredis';

import { logger } from '@celebs/shared-utils';

import { redisConnection } from './queue.service';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redisConnection.host) return null;
  if (!redisClient) {
    try {
      redisClient = new Redis({
        ...redisConnection,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });
      redisClient.on('error', (err) => {
        logger.warn({ err: err.message }, '[RedisCache] Redis client error');
      });
    } catch (err) {
      logger.warn({ err }, '[RedisCache] Failed to initialize Redis client');
      return null;
    }
  }
  return redisClient;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ key, err }, '[RedisCache] Failed to read cached JSON');
    return null;
  }
}

export async function setCachedJson(key: string, data: unknown, ttlSeconds = 600): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ key, err }, '[RedisCache] Failed to write cached JSON');
  }
}

export async function invalidateCacheKey(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    logger.warn({ key, err }, '[RedisCache] Failed to delete cache key');
  }
}

/**
 * Best-effort pattern sweep (e.g. hash-keyed list entries). Keyspace is
 * small by design; never use for hot paths — only visibility flips and
 * end-of-run seed hygiene.
 */
export async function scanDelByPattern(
  pattern: string,
  count = 100,
  getClient: () => Redis | null = getRedisClient,
): Promise<number> {
  const client = getClient();
  if (!client) return 0;
  try {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys]: [string, string[]] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
      );
      cursor = next;
      if (keys.length > 0) {
        deleted += await client.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  } catch (err) {
    logger.warn({ pattern, err }, '[RedisCache] Failed pattern sweep');
    return 0;
  }
}
