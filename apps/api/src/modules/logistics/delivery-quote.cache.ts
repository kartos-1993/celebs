import { logger } from '@celebs/shared-utils';

import type { CourierQuote } from './adapters/pathao-price.client';
import type { DeliveryQuoteCache } from './delivery-quote.service';

import { Prisma } from '@/config/db.prisma';
import { cacheRedis } from '@/config/upstash.redis';

/**
 * How long one courier answer stands in.
 *
 * Short enough that a rate change is picked up the same day, long enough that a
 * cart being opened ten times does not mean ten calls to a third party. Pathao
 * sells price plans in day bands, so an hour is comfortably inside a band and
 * still refreshes several times a day.
 */
export const DELIVERY_QUOTE_TTL_SECONDS = 3600;

/**
 * Caches courier quotes in Redis.
 *
 * Every method swallows its failures on purpose. A cache outage should cost a few
 * extra calls to the courier, not the checkout: the whole reason this layer exists
 * is to protect a third party's latency and uptime from becoming ours, and a cache
 * that throws on a Redis blip would do the opposite.
 *
 * A value that cannot be read back as a quote is also treated as a miss. Serving
 * half a quote is worse than making the call again.
 */
export const cachedDeliveryQuoteCache: DeliveryQuoteCache = {
  async get(key: string): Promise<CourierQuote | null> {
    try {
      const raw = await cacheRedis.get<unknown>(key);
      if (raw === null || typeof raw !== 'object') return null;

      const candidate = raw as Partial<CourierQuote>;
      if (typeof candidate.planId !== 'number') {
        logger.warn({ key }, 'Discarding an unreadable delivery quote cache entry');
        return null;
      }

      // Redis stores JSON, so a quote written as Decimals comes back as plain
      // data (`{s,e,d}` objects or strings). Revive both amounts before anything
      // touches them: the same field would otherwise serialise as a string on a
      // fresh quote and an object on a cached one.
      let finalPrice: Prisma.Decimal;
      let codPercentage: Prisma.Decimal;
      try {
        finalPrice = new Prisma.Decimal(
          candidate.finalPrice as unknown as string | number | Prisma.Decimal,
        );
        codPercentage = new Prisma.Decimal(
          candidate.codPercentage as unknown as string | number | Prisma.Decimal,
        );
      } catch {
        logger.warn({ key }, 'Discarding a delivery quote cache entry with unreadable amounts');
        return null;
      }

      if (!finalPrice.isFinite() || !codPercentage.isFinite()) {
        logger.warn({ key }, 'Discarding a delivery quote cache entry with non-finite amounts');
        return null;
      }

      return {
        finalPrice,
        planId: candidate.planId,
        codPercentage,
        codEnabled: candidate.codEnabled === true,
        raw: (candidate.raw ?? {}) as Record<string, unknown>,
      };
    } catch (err: unknown) {
      logger.warn({ err, key }, 'Delivery quote cache read failed; quoting the courier');
      return null;
    }
  },

  async set(key: string, value: CourierQuote): Promise<void> {
    try {
      await cacheRedis.set(key, value, { ex: DELIVERY_QUOTE_TTL_SECONDS });
    } catch (err: unknown) {
      logger.warn({ err, key }, 'Delivery quote cache write failed; the quote is still valid');
    }
  },
};
