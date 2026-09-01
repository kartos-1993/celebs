import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

import { logger } from '@celebs/shared-utils';

import { config } from './app.config';

/**
 * Dual-mode cache client.
 *
 * - Upstash cloud (host contains "upstash.io"): speaks Upstash's HTTPS REST
 *   protocol via @upstash/redis — the only protocol those endpoints accept.
 * - Anything else (local Memurai / Docker redis / self-hosted): standard
 *   Redis TCP via ioredis, password optional.
 *
 * Both modes expose the same tiny async surface used by the session store
 * and TtlCache: get / set / del / expire.
 */

const host = (config.REDIS.HOST || 'localhost').trim().replace(/^https?:\/\//, '');
const isUpstash = host.includes('upstash.io');

interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>;
  del(...keys: string[]): Promise<void>;
  expire(key: string, ttlSec: number): Promise<void>;
}

function wrapError(scope: string, err: unknown): never {
  logger.warn({ err, scope }, 'Redis cache operation failed');
  throw err;
}

let tcpClient: Redis | null = null;

function getTcpClient(): Redis {
  if (!tcpClient) {
    tcpClient = new Redis({
      host,
      port: config.REDIS.PORT || 6379,
      // Memurai/local dev commonly runs without requirepass
      password: config.REDIS.PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    tcpClient.on('error', (err) => {
      logger.warn({ err }, 'Local Redis connection error');
    });
  }
  return tcpClient;
}

const restClient = isUpstash
  ? new UpstashRedis({ url: `https://${host}`, token: config.REDIS.PASSWORD })
  : null;

const tcpAdapter: CacheClient = {
  async get<T>(key: string) {
    try {
      const raw = await getTcpClient().get(key);
      if (raw === null || raw === undefined) return null;
      if (typeof raw !== 'string') return raw as T;
      try {
        return JSON.parse(raw) as T;
      } catch {
        const fallback: unknown = raw;
        return fallback as T;
      }
    } catch (err) {
      wrapError('tcp.get', err);
    }
  },
  async set(key, value, opts) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (opts?.ex) {
        await getTcpClient().set(key, serialized, 'EX', opts.ex);
      } else {
        await getTcpClient().set(key, serialized);
      }
    } catch (err) {
      wrapError('tcp.set', err);
    }
  },
  async del(...keys) {
    try {
      if (keys.length > 0) await getTcpClient().del(...keys);
    } catch (err) {
      wrapError('tcp.del', err);
    }
  },
  async expire(key, ttlSec) {
    try {
      await getTcpClient().expire(key, ttlSec);
    } catch (err) {
      wrapError('tcp.expire', err);
    }
  },
};

const restAdapter: CacheClient = {
  async get<T>(key: string) {
    try {
      return (await restClient!.get<T>(key)) ?? null;
    } catch (err) {
      wrapError('rest.get', err);
    }
  },
  async set(key, value, opts) {
    try {
      await restClient!.set(key, value as never, opts?.ex ? { ex: opts.ex } : undefined);
    } catch (err) {
      wrapError('rest.set', err);
    }
  },
  async del(...keys) {
    try {
      if (keys.length > 0) await restClient!.del(...keys);
    } catch (err) {
      wrapError('rest.del', err);
    }
  },
  async expire(key, ttlSec) {
    try {
      await restClient!.expire(key, ttlSec);
    } catch (err) {
      wrapError('rest.expire', err);
    }
  },
};

export const cacheRedis: CacheClient = isUpstash ? restAdapter : tcpAdapter;

/** Kept for backward-compatible imports (session-store, ttl-cache). */
export const upstashRedis = {
  get: <T>(key: string) => cacheRedis.get<T>(key),
  set: (key: string, value: unknown, opts?: { ex?: number }) => cacheRedis.set(key, value, opts),
  del: (...keys: string[]) => cacheRedis.del(...keys),
  expire: (key: string, ttlSec: number) => cacheRedis.expire(key, ttlSec),
};
