import { logger } from '@celebs/shared-utils';

import { upstashRedis } from '@/config/upstash.redis';

interface L1Entry {
  data: unknown;
  expiresAt: number;
}

const L1_TTL_MS = 60_000;

/**
 * Generic two-tier TTL cache (in-process L1 + Upstash Redis L2), extracted
 * from the platform-settings repository pattern so storefront hot reads
 * (banners, campaigns, combos, category tree) can reuse it.
 *
 * Multi-instance note: invalidation clears this instance's L1 and the shared
 * L2; other instances' L1 entries self-heal within the 60s L1 TTL. For
 * merchandising data that staleness window is acceptable.
 */
export class TtlCache<T> {
  private l1 = new Map<string, L1Entry>();
  /** Keys issued via set() — enables namespace sweep on invalidate(). */
  private issuedKeys = new Set<string>();

  constructor(
    private readonly namespace: string,
    private readonly l2TtlSec = 300,
  ) {}

  /** Returns cached value from L1 or L2, or null on miss/failure. */
  async get(key: string): Promise<T | null> {
    const now = Date.now();
    const local = this.l1.get(key);
    if (local && local.expiresAt > now) {
      return local.data as T;
    }

    try {
      const raw = await upstashRedis.get<string>(`${this.namespace}:${key}`);
      if (raw) {
        const parsed = typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
        this.l1.set(key, { data: parsed, expiresAt: now + L1_TTL_MS });
        return parsed;
      }
    } catch (err) {
      logger.warn({ err, cache: this.namespace, key }, 'TtlCache L2 read failed');
    }

    return null;
  }

  async set(key: string, value: T): Promise<void> {
    this.l1.set(key, { data: value, expiresAt: Date.now() + L1_TTL_MS });
    this.issuedKeys.add(key);
    try {
      await upstashRedis.set(
        `${this.namespace}:${key}`,
        JSON.stringify(value),
        { ex: this.l2TtlSec },
      );
    } catch (err) {
      logger.warn({ err, cache: this.namespace, key }, 'TtlCache L2 write failed');
    }
  }

  /** Invalidate one key, or every key issued through this cache instance. */
  async invalidate(key?: string): Promise<void> {
    const targets = key ? [key] : [...this.issuedKeys];
    for (const target of targets) {
      this.l1.delete(target);
    }
    if (!key) {
      this.issuedKeys.clear();
    }

    await Promise.allSettled(
      targets.map((target) => upstashRedis.del(`${this.namespace}:${target}`)),
    );
  }
}
