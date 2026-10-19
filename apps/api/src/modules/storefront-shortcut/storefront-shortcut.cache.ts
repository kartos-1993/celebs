import { logger } from '@celebs/shared-utils';

import type { StorefrontConfigResponse } from './storefront-shortcut.service';

import { cacheRedis } from '@/config/upstash.redis';

/**
 * How long a built storefront config stands in for.
 *
 * Short enough that an edit made outside this API (a seed run, a direct
 * database change) is picked up within the same session, long enough that a
 * customer walking a category tree does not re-run the shortcut queries on
 * every screen open. CRUD through this API invalidates the key immediately,
 * so the TTL is the floor, not the mechanism.
 */
export const STOREFRONT_SHORTCUTS_TTL_SECONDS = 300;

export interface StorefrontShortcutCache {
  get(slug: string): Promise<StorefrontConfigResponse | null>;
  set(slug: string, config: StorefrontConfigResponse): Promise<void>;
  invalidate(slug: string): Promise<void>;
}

/**
 * Keyed by the canonical category slug, so slug/id/name/path requests for the
 * same category share one entry.
 */
function key(slug: string): string {
  return `storefront:shortcuts:${slug}`;
}

/**
 * A cached payload is only trusted if it still looks like a config: a stale
 * shape from a previous deploy is a cache miss, not a crash.
 */
function isStorefrontConfig(value: unknown): value is StorefrontConfigResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { category?: unknown; shortcuts?: unknown };
  return (
    !!candidate.category &&
    typeof candidate.category === 'object' &&
    Array.isArray(candidate.shortcuts)
  );
}

/**
 * Every method swallows its failures on purpose: this cache protects the
 * database from repeat reads, so a Redis blip must cost a database read, not
 * the storefront screen.
 */
export const storefrontShortcutCache: StorefrontShortcutCache = {
  async get(slug) {
    try {
      const cached = await cacheRedis.get<unknown>(key(slug));
      if (cached === null) return null;

      if (!isStorefrontConfig(cached)) {
        logger.warn({ slug }, 'Discarding a cached storefront config with an unexpected shape');
        return null;
      }

      return cached;
    } catch (err) {
      logger.warn({ err, scope: 'tcp.get' }, 'Redis cache operation failed');
      return null;
    }
  },

  async set(slug, config) {
    try {
      await cacheRedis.set(key(slug), config, { ex: STOREFRONT_SHORTCUTS_TTL_SECONDS });
    } catch (err) {
      logger.warn({ err, scope: 'tcp.set' }, 'Redis cache operation failed');
    }
  },

  async invalidate(slug) {
    try {
      await cacheRedis.del(key(slug));
    } catch (err) {
      logger.warn({ err, scope: 'tcp.del' }, 'Redis cache operation failed');
    }
  },
};
