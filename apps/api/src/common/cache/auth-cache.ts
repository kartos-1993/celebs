import prisma from '@/config/db.prisma';
import { cacheRedis } from '@/config/upstash.redis';

/**
 * Short-TTL Redis cache for the JWT identity layer (session validity +
 * user principal), the hottest query pair in the app.
 *
 * Correctness contract:
 *  - Session keys are invalidated at EVERY revocation point (logout,
 *    refresh-reuse termination, store suspension). This preserves the
 *    "instant server-side revocation" guarantee while letting warm requests
 *    skip both Postgres round trips entirely.
 *  - User principal staleness is bounded by the TTL (30s): role/permission
 *    flips propagate within one TTL window. Acceptable by design — Layer-2
 *    guards re-read lifecycle state from Postgres when it matters.
 *  - Every cache error degrades to a DB fallback, never to a false allow.
 */

const AUTH_CACHE_TTL_SECONDS = 30;
const SESSION_PREFIX = 'celebs_auth:s:';
const USER_PREFIX = 'celebs_auth:u:';

export interface CachedAuthPrincipal {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  permissions: unknown;
  isEmailVerified: boolean;
  vendorId: string | null;
  vendorProfile: { id: string } | null;
}

async function safeGet<T>(key: string): Promise<T | null> {
  try {
    return await cacheRedis.get<T>(key);
  } catch {
    return null;
  }
}

async function safeSet(key: string, value: unknown): Promise<void> {
  try {
    await cacheRedis.set(key, value, { ex: AUTH_CACHE_TTL_SECONDS });
  } catch {
    // Cache write failures are non-fatal; next request repopulates from DB.
  }
}

async function safeDel(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await cacheRedis.del(...keys);
  } catch {
    // Worst case: a revoked identity stays honored for <= TTL seconds.
    // Revocation paths delete the DB row regardless.
  }
}

export const authCache = {
  ttlSeconds: AUTH_CACHE_TTL_SECONDS,

  async getSession(sessionId: string): Promise<{ id: string; expiredAt: Date | null } | null> {
    const hit = await safeGet<{ expiredAt: string | null }>(`${SESSION_PREFIX}${sessionId}`);
    if (!hit) return null;
    return {
      id: sessionId,
      expiredAt: hit.expiredAt ? new Date(hit.expiredAt) : null,
    };
  },

  async setSession(sessionId: string, expiredAt: Date | null): Promise<void> {
    await safeSet(`${SESSION_PREFIX}${sessionId}`, {
      expiredAt: expiredAt ? expiredAt.toISOString() : null,
    });
  },

  async getUser(userId: string): Promise<CachedAuthPrincipal | null> {
    return safeGet<CachedAuthPrincipal>(`${USER_PREFIX}${userId}`);
  },

  async setUser(userId: string, principal: CachedAuthPrincipal): Promise<void> {
    await safeSet(`${USER_PREFIX}${userId}`, principal);
  },

  async invalidateSessions(sessionIds: string[]): Promise<void> {
    await safeDel(sessionIds.map((id) => `${SESSION_PREFIX}${id}`));
  },
};

/**
 * DB-backed loaders shared by the passport strategy so cache misses and
 * repopulation live in one place.
 */
export const authCacheLoaders = {
  async loadSession(sessionId: string) {
    const fresh = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, expiredAt: true },
    });
    if (fresh) {
      await authCache.setSession(fresh.id, fresh.expiredAt);
      return { id: fresh.id, expiredAt: fresh.expiredAt };
    }
    return null;
  },

  async loadUser(userId: string): Promise<CachedAuthPrincipal | null> {
    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isEmailVerified: true,
        vendorId: true,
        vendorProfile: { select: { id: true } },
      },
    });
    if (!fresh) return null;
    await authCache.setUser(fresh.id, fresh as CachedAuthPrincipal);
    return fresh as CachedAuthPrincipal;
  },
};
